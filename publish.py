#!/usr/bin/env python3
"""Publish this new homepage and disable the old Pages site with the user's gh login."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

OWNER = "algebra-MCX"
REPO = f"{OWNER}/{OWNER}.github.io"
OLD_REPO = f"{OWNER}/Academic-Profile"
ROOT = Path(__file__).resolve().parent
FILES = ["index.html", "style.css", "main.js", "glass.js", "config.js", "assets/mark.svg", "assets/runtime.svg", "assets/compute.svg", "CNAME", ".nojekyll", ".gitignore", "publish.py", "publish.command", "使用说明.txt"]


def execute(args, *, payload=None, check=True):
    result = subprocess.run(args, input=payload, text=True, capture_output=True, cwd=ROOT)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def api(path, method="GET", data=None, allow_missing=False):
    args = ["gh", "api", path, "--method", method, "-H", "Accept: application/vnd.github+json"]
    if data is not None:
        args += ["--input", "-"]
    result = execute(args, payload=json.dumps(data) if data is not None else None, check=False)
    if result.returncode:
        if allow_missing and "HTTP 404" in result.stderr:
            return None
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    if not shutil.which("gh") or not shutil.which("git"):
        raise RuntimeError("需要安装 GitHub CLI（gh）与 git。")
    if execute(["gh", "auth", "status"], check=False).returncode:
        raise RuntimeError("请先在终端运行 gh auth login，登录 GitHub 后再运行本脚本。")
    user = api("user")["login"]
    if user.lower() != OWNER.lower():
        raise RuntimeError(f"当前账号为 {user}，需要登录 {OWNER}。尚未修改远程仓库。")
    for name in FILES:
        if not (ROOT / name).is_file():
            raise RuntimeError(f"缺少站点文件：{name}")
    if api(f"repos/{REPO}", allow_missing=True) is not None:
        raise RuntimeError(f"仓库 {REPO} 已存在；为避免覆盖其内容，已停止。可以通过仓库 Settings → Pages 检查发布状态。")
    if (ROOT / ".git").exists():
        raise RuntimeError("本目录已包含 Git 记录；请检查上次发布结果后再继续，避免重复发布。")

    # Make a complete local commit before any remote change.
    execute(["git", "init", "-b", "main"])
    execute(["git", "add", "--", *FILES])
    execute(["git", "-c", "user.name=Chenxi Ma", "-c", f"user.email={OWNER}@users.noreply.github.com", "commit", "-m", "Create Chenxi Ma personal homepage"])
    print(f"创建新仓库 {REPO}…", flush=True)
    execute(["gh", "repo", "create", REPO, "--public", "--source", str(ROOT), "--remote", "origin", "--push"])
    print("启用 GitHub Pages，并配置 chenxima.com…", flush=True)
    pages = api(f"repos/{REPO}/pages", allow_missing=True)
    if pages is None:
        api(f"repos/{REPO}/pages", "POST", {"build_type": "legacy", "source": {"branch": "main", "path": "/"}})
    api(f"repos/{REPO}/pages", "PUT", {"cname": "chenxima.com"})
    configured = api(f"repos/{REPO}/pages")
    if configured.get("cname", "").lower() != "chenxima.com":
        raise RuntimeError("新站已创建，但域名配置尚未确认。旧站尚未关闭。")

    print("关闭旧 Academic-Profile 站点，保留其仓库内容…", flush=True)
    if api(f"repos/{OLD_REPO}/pages", allow_missing=True) is not None:
        api(f"repos/{OLD_REPO}/pages", "DELETE")
    if api(f"repos/{OLD_REPO}/pages", allow_missing=True) is not None:
        raise RuntimeError("旧站的关闭状态未能确认，请在其 Settings → Pages 中检查。")
    print("旧站已关闭。新站已提交发布，GitHub 构建与域名解析生效后可访问 https://chenxima.com/。")
    print(f"新站设置：https://github.com/{REPO}/settings/pages")
    print("请按使用说明配置域名 DNS，并在 GitHub Pages 设置中启用 HTTPS。")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, KeyError, ValueError) as exc:
        print(f"发布未完成：{exc}", file=sys.stderr)
        print("未删除任何仓库；如果新仓库已创建，可到其 Settings → Pages 查看状态。", file=sys.stderr)
        sys.exit(1)
