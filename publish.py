#!/usr/bin/env python3
"""Create the homepage on the free GitHub Pages address with the user's gh login."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

OWNER = "algebra-MCX"
REPO = f"{OWNER}/{OWNER}.github.io"
ROOT = Path(__file__).resolve().parent
FILES = ["index.html", "style.css", "main.js", "glass.js", "config.js", "assets/mark.svg", "assets/runtime.svg", "assets/compute.svg", ".nojekyll", ".gitignore", "publish.py", "publish.command", "使用说明.txt"]


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
    print("启用免费的 GitHub Pages 地址…", flush=True)
    pages = api(f"repos/{REPO}/pages", allow_missing=True)
    if pages is None:
        api(f"repos/{REPO}/pages", "POST", {"build_type": "legacy", "source": {"branch": "main", "path": "/"}})
    configured = api(f"repos/{REPO}/pages")
    if configured.get("cname"):
        raise RuntimeError("Pages 仍有自定义域名，请到 Settings → Pages → Custom domain 点击 Remove。")
    print("新站已提交发布，GitHub 构建完成后可访问 https://algebra-mcx.github.io/。")
    print(f"新站设置：https://github.com/{REPO}/settings/pages")
    print("使用默认地址无需购买域名或配置 DNS。")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, KeyError, ValueError) as exc:
        print(f"发布未完成：{exc}", file=sys.stderr)
        print("未删除任何仓库；如果新仓库已创建，可到其 Settings → Pages 查看状态。", file=sys.stderr)
        sys.exit(1)
