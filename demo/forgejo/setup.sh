#!/usr/bin/env bash
# demo/forgejo/setup.sh starts a throwaway local Forgejo as the game studio's git server, for the scenes that open a pull
# request in it (22): orbit/nebula-run with pull request #220 of the refund card. The console links to https://git.example,
# and the recorder serves that host from 127.0.0.1:3300. Every run starts fresh; `docker rm -f film-forgejo` stops it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
D=${FORGEJO_DIR:-/tmp/film-forgejo}
API=http://127.0.0.1:3300/api/v1
# a local instance that nothing outside this machine reaches; the password only lets the script make tokens
PASS='film-pass-4711'

docker rm -f film-forgejo >/dev/null 2>&1 || true
rm -rf "$D/data" "$D/work"
mkdir -p "$D/data" "$D/work"

docker run -d --name film-forgejo -p 127.0.0.1:3300:3000 \
  -v "$D/data:/data" \
  -e USER_UID="$(id -u)" -e USER_GID="$(id -g)" \
  -e FORGEJO__DEFAULT__APP_NAME=Forgejo \
  -e FORGEJO__server__ROOT_URL=https://git.example/ \
  -e FORGEJO__server__DOMAIN=git.example \
  -e FORGEJO__server__SSH_DOMAIN=git.example \
  -e FORGEJO__server__DISABLE_SSH=true \
  -e FORGEJO__server__OFFLINE_MODE=true \
  -e FORGEJO__security__INSTALL_LOCK=true \
  -e FORGEJO__database__DB_TYPE=sqlite3 \
  -e FORGEJO__mailer__ENABLED=false \
  -e FORGEJO__service__DISABLE_REGISTRATION=true \
  -e FORGEJO__service__ENABLE_NOTIFY_MAIL=false \
  -e FORGEJO__picture__DISABLE_GRAVATAR=true \
  -e FORGEJO__picture__ENABLE_FEDERATED_AVATAR=false \
  -e FORGEJO__ui__DEFAULT_THEME=forgejo-dark \
  -e FORGEJO__actions__ENABLED=false \
  -e FORGEJO__log__LEVEL=Warn \
  codeberg.org/forgejo/forgejo:15.0.9 >/dev/null

until curl -fs $API/version >/dev/null; do sleep 1; done

docker exec -u git film-forgejo forgejo admin user create --admin \
  --username sebastian --email sebastian@example.com --password "$PASS" \
  --must-change-password=false >/dev/null

tok() { # user -> token
  curl -fs -u "$1:$PASS" -H 'Content-Type: application/json' \
    -d "{\"name\":\"film-$RANDOM\",\"scopes\":[\"all\"]}" "$API/users/$1/tokens" | jq -r .sha1
}
call() { # token method path [json]
  local t=$1 m=$2 p=$3; shift 3
  curl -fs -X "$m" -H "Authorization: token $t" -H 'Content-Type: application/json' ${1:+-d "$1"} "$API$p"
}

S=$(tok sebastian)
call $S PATCH /admin/users/sebastian '{"login_name":"sebastian","source_id":0,"full_name":"Sebastian"}' >/dev/null
for u in factory-agent factory-gate; do
  call $S POST /admin/users "{\"username\":\"$u\",\"email\":\"$u@example.com\",\"password\":\"$PASS\",\"full_name\":\"$u\",\"must_change_password\":false,\"send_notify\":false}" >/dev/null
done
A=$(tok factory-agent)
G=$(tok factory-gate)

call $S POST /orgs '{"username":"orbit","full_name":"orbit","visibility":"public"}' >/dev/null
call $S POST /orgs/orbit/repos '{"name":"nebula-run","description":"Nebula Run: a co-op browser space shooter with a Go game server.","private":false,"default_branch":"main"}' >/dev/null
for u in factory-agent factory-gate; do
  call $S PUT /repos/orbit/nebula-run/collaborators/$u '{"permission":"write"}' >/dev/null
done

gitas() { # user token email -> configure repo identity
  git -C "$W" config user.name "$1"; git -C "$W" config user.email "$3"
}
W=$D/work/repo
git init -q -b main "$W"
cp -r "$here/content/base/." "$W/"
gitas sebastian x sebastian@example.com
git -C "$W" add -A
git -C "$W" commit -qm "Nebula Run: first playable sector, store and game server"
git -C "$W" push -q "http://sebastian:$S@127.0.0.1:3300/orbit/nebula-run.git" main

# 219 closed cards so the next number is 220
topics=("Tune asteroid spawn rate" "Shield role feels weak" "Boss telegraph is unclear" "Skin preview flickers" "Lobby drops a pilot" "Engine trail on mobile" "Store price rounding" "Sector pass copy" "Server tick drift" "Gunner aim assist")
for n in $(seq 1 219); do
  title="Card $n: ${topics[$((n % 10))]}"
  [ $n = 122 ] && title="Card 122: Refund a purchase the server rolls back"
  call $S POST /repos/orbit/nebula-run/issues "$(jq -nc --arg t "$title" '{title:$t,body:"Studio card."}')" >/dev/null
  call $S PATCH /repos/orbit/nebula-run/issues/$n '{"state":"closed"}' >/dev/null
done
last=$(call $S GET '/repos/orbit/nebula-run/issues?state=all&type=issues&limit=1&sort=created&direction=desc' | jq '.[0].number')
open=$(call $S GET '/repos/orbit/nebula-run/issues?state=open&type=issues&limit=1' | jq length)
[ "$last" = 219 ] && [ "$open" = 0 ] || { echo "counter check failed: last=$last open=$open"; exit 1; }

git -C "$W" checkout -q -b factory/t-47db29d200e1
cp -r "$here/content/change/." "$W/"
gitas factory-agent x factory-agent@example.com
git -C "$W" add -A
git -C "$W" commit -qm "Store: refund a purchase the server rolls back"
git -C "$W" push -q "http://factory-agent:$A@127.0.0.1:3300/orbit/nebula-run.git" factory/t-47db29d200e1
git -C "$W" diff --numstat main HEAD

BODY=$(printf 'Closes #122.\n\nRefunds a purchase the game server rolls back to the player'"'"'s card, once per purchase.\n\nAdds refundPurchase in src/payments/refund.ts, called when the game server rolls back a purchase. It creates one Stripe refund per paid purchase with an idempotency key, so a rollback sent twice refunds once. The charge.refunded webhook marks the purchase refunded, and a failed refund shows on the purchase'"'"'s page for support. Tests cover a double rollback and a declined refund.')
num=$(call $A POST /repos/orbit/nebula-run/pulls "$(jq -nc --arg b "$BODY" '{title:"Store: refund a purchase the server rolls back",head:"factory/t-47db29d200e1",base:"main",body:$b}')" | jq .number)
[ "$num" = 220 ] || { echo "pull request got number $num"; exit 1; }
call $G POST /repos/orbit/nebula-run/pulls/220/reviews "$(jq -nc '{event:"COMMENT",body:"Model review: approve. Refunds key on the purchase'"'"'s id, and the tests send a rollback twice and find one refund. Risk class high: a human approves the merge."}')" >/dev/null
echo "ready: https://git.example/orbit/nebula-run/pulls/220 via 127.0.0.1:3300"
