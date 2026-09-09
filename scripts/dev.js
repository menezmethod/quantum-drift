const { spawn } = require("node:child_process");
const children = [
  spawn(process.execPath, ["server/server.js"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3000" },
  }),
  spawn(
    process.execPath,
    ["node_modules/webpack-cli/bin/cli.js", "serve", "--mode", "development"],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
children.forEach((child) => {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
