import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidDir = path.join(root, "android");
const mode = process.argv[2] === "debug" ? "debug" : "release";
const task = mode === "debug" ? "assembleDebug" : "assembleRelease";

const env = { ...process.env };
if (!env.JAVA_HOME && fs.existsSync("C:\\Android\\jdk")) {
  env.JAVA_HOME = "C:\\Android\\jdk";
  env.PATH = `${path.join(env.JAVA_HOME, "bin")};${env.PATH || ""}`;
}
if (!env.ANDROID_HOME && fs.existsSync("C:\\Android\\sdk")) {
  env.ANDROID_HOME = "C:\\Android\\sdk";
}
if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
}

const localProps = path.join(androidDir, "local.properties");
if (!fs.existsSync(localProps) && env.ANDROID_HOME) {
  fs.writeFileSync(
    localProps,
    `sdk.dir=${env.ANDROID_HOME.replace(/\\/g, "\\\\")}\n`,
    "utf8"
  );
}

const isWin = process.platform === "win32";
function runWinSafe(bin, args, opts) {
  if (!isWin) {
    return spawnSync(bin, args, { ...opts, stdio: "inherit" });
  }
  const q = s => (/\s/.test(s) ? `"${s}"` : s);
  const cmdLine = `"${[q(bin), ...args.map(q)].join(" ")}"`;
  return spawnSync("cmd.exe", ["/d", "/s", "/c", cmdLine], {
    ...opts,
    stdio: "inherit",
    windowsVerbatimArguments: true
  });
}

const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");
const res = runWinSafe(gradlew, [task, "--no-daemon"], { cwd: androidDir, env });

if (res.status !== 0) {
  process.exit(res.status || 1);
}

const apkSrc = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  mode,
  mode === "debug" ? "app-debug.apk" : "app-release.apk"
);
const gradleText = fs.readFileSync(path.join(androidDir, "app", "build.gradle"), "utf8");
const verMatch = gradleText.match(/versionName\s+["']([^"']+)["']/);
const appVer = verMatch ? verMatch[1] : "1.1";
const apkDest = path.join(
  root,
  mode === "debug" ? `Yudum-v${appVer}-debug.apk` : `Yudum-v${appVer}.apk`
);

if (!fs.existsSync(apkSrc)) {
  throw new Error(`Expected APK not found: ${apkSrc}`);
}
fs.copyFileSync(apkSrc, apkDest);
const sizeMb = (fs.statSync(apkDest).size / (1024 * 1024)).toFixed(2);
console.log(`Built APK -> ${apkDest} (${sizeMb} MB)`);

const buildToolsDir = env.ANDROID_HOME ? path.join(env.ANDROID_HOME, "build-tools") : "";
if (buildToolsDir && fs.existsSync(buildToolsDir)) {
  const vers = fs.readdirSync(buildToolsDir).sort().reverse();
  for (const v of vers) {
    const signer = path.join(buildToolsDir, v, isWin ? "apksigner.bat" : "apksigner");
    if (fs.existsSync(signer)) {
      const vRes = runWinSafe(signer, ["verify", "--print-certs", apkDest], { env });
      if (vRes.status !== 0) process.exit(vRes.status || 1);
      break;
    }
  }
}
