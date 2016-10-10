import spawn from 'child_process';
import { Deferred } from './Deferred';

var requestId = 1;
var buffer = new Buffer(0);
var fuseClient;

const requestStack = {};

export const request = function request (payload) {
  payload.Id = requestId++;

  requestStack[payload.Id] = new Deferred();

  send(spawnClient(), "Request", JSON.stringify(payload));

  return requestStack[payload.Id].promise;
}

const reply = function reply(id, payload) {
  if (requestStack[id]) {
    requestStack[id].resolve(payload);
    requestStack[id] = null;
  }
}

function spawnClient() {
  if (fuseClient) {
    return fuseClient;
  }

  // Spawn daemon client
  fuseClient = spawn.spawn("fuse", ['daemon-client', 'vscode client']);

  fuseClient.stdout.on('data', function (data) {
    // Data is a stream and must be parsed as that
    var latestBuf = Buffer.concat([buffer, data]);
    buffer = parseMsgFromBuffer(latestBuf, function (message) {
      const json = JSON.parse(message);

      reply(json.Id, json);
    });
  });

  fuseClient.stderr.on('data', function (data) {
    console.log(data.toString('utf-8'));
  });

  fuseClient.on('close', function (code) {
    console.log('fuse: daemon client closed with code ' + code);
    fuseClient = null;
  });

  return fuseClient;
}

function parseMsgFromBuffer(buffer, msgCallback) {
  var start = 0;

  while (start < buffer.length) {
    var endOfMsgType = buffer.indexOf('\n', start);
    if (endOfMsgType < 0)
      break; // Incomplete or corrupt data

    var startOfLength = endOfMsgType + 1;
    var endOfLength = buffer.indexOf('\n', startOfLength);
    if (endOfLength < 0)
      break; // Incomplete or corrupt data

    var msgType = buffer.toString('utf-8', start, endOfMsgType);
    var length = parseInt(buffer.toString('utf-8', startOfLength, endOfLength));
    if (isNaN(length)) {
      console.log('fuse: Corrupt length in data received from Fuse.');
      // Try to recover by starting from the beginning
      start = endOfLength + 1;
      continue;
    }

    var startOfData = endOfLength + 1;
    var endOfData = startOfData + length;
    if (buffer.length < endOfData)
      break; // Incomplete data

    var jsonData = buffer.toString('utf-8', startOfData, endOfData);
    msgCallback(jsonData);

    start = endOfData;
  }

  return buffer.slice(start, buffer.length);
}

function send(fuseClient, msgType, serializedMsg) {
  // Pack the message to be compatible with Fuse Protocol.
  // As:
  // '''
  // MessageType (msgType)
  // Length (length)
  // JSON(serializedMsg)
  // '''
  // For example:
  // '''
  // Event
  // 50
  // {
  //   "Name": "Test",
  //   "Data":
  //   {
  //     "Foo": "Bar"
  //   }
  // }
  // '''
  var length = Buffer.byteLength(serializedMsg, 'utf-8');
  var packedMsg = msgType + '\n' + length + '\n' + serializedMsg;

  try {
    fuseClient.stdin.write(packedMsg);
  }
  catch (e) {
    console.log(e);
  }
}