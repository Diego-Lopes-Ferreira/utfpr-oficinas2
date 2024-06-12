let port;
let reader;

const encoder = new TextEncoder();
function serial_send_data(data) {
  console.log(`Sending: "${data}"`);
  if (port?.writable == null) {
    console.warn(`unable to find writable port`);
    return;
  }
  const writer = port.writable.getWriter();
  writer.write(encoder.encode(data));
  writer.releaseLock();
}

function test_send_message() {
  let msg = document.querySelector("input#msg").value;
  serial_send_data(msg);
}

const decoder = new TextDecoder();
var big_buffer = "";
async function serial_start_connection(callback) {
  port = await navigator.serial.requestPort({});
  if (!port) {
    return;
  }

  // Start port
  try {
    await port.open({ baudRate: 9600 });
  } catch (e) {
    console.warn("dd: could not start serial connection");
    return;
  }

  console.log("Started connection");

  // Read stuff
  try {
    reader = port.readable.getReader();
    let buffer;
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        big_buffer += decoder.decode(value);
        if (big_buffer.slice("-1") == "\n") {
          callback(big_buffer);
          big_buffer = "";
        }
      }
      if (done) break;
    }
  } catch (e) {
    console.warn("dd: error");
  } finally {
    if (reader) {
      reader.releaseLock();
      reader = undefined;
    }
  }

  if (port) {
    try {
      await port.close();
    } catch (e) {
      console.warn(e);
    }
  }
}

async function serial_stop_connection() {
  const localPort = port; // Move port to a local instance
  port = undefined;

  if (reader) {
    await reader.cancel();
  }

  if (localPort) {
    try {
      await localPort.close();
    } catch (e) {
      console.warn(e);
    }
  }

  console.log("Stoped connection");
}
