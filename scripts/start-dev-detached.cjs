const fs = require("fs");
const childProcess = require("child_process");
const path = require("path");

const cwd = path.resolve(__dirname, "..");
const out = fs.openSync(path.join(cwd, "dev-server.log"), "a");
const err = fs.openSync(path.join(cwd, "dev-server.err.log"), "a");
const nodePath = "C:\\Program Files\\nodejs;C:\\Windows\\System32;C:\\Windows";

const child = childProcess.spawn(
  "C:\\Windows\\System32\\cmd.exe",
  ["/d", "/s", "/c", "cd /d C:\\Users\\Admin\\Documents\\pixel_world && npx.cmd next dev --port 3000"],
  {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", out, err],
    env: {
      ...process.env,
      Path: nodePath,
      PATH: nodePath
    }
  }
);

child.unref();
console.log(child.pid);
