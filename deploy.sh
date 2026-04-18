#!/bin/bash
# deploy.sh - One-click deploy pesantren-absensi
# Push ke pesantren-absensi (source) + pesantren-deploy (deploy repo)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Deploy Pesantren Absensi${NC}"
echo "================================"

# Check if inside git repo
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Bukan git repo! Jalankan di folder pesantren-absensi${NC}"
  exit 1
fi

# Check for changes
if git diff --quiet && git diff --cached --quiet; then
  echo -e "${YELLOW}⚠️  Tidak ada perubahan untuk di-commit${NC}"
  echo -e "${YELLOW}Tetap push ke deploy repo? (y/n)${NC}"
  read -r confirm
  if [ "$confirm" != "y" ]; then
    echo "Batal."
    exit 0
  fi
else
  # Show changes
  echo -e "\n${YELLOW}📝 Perubahan:${NC}"
  git status -s

  # Commit message
  if [ -n "$1" ]; then
    MSG="$1"
  else
    echo -e "\n${YELLOW}💬 Pesan commit (atau Enter untuk auto):${NC}"
    read -r MSG
    if [ -z "$MSG" ]; then
      MSG="Update: $(date '+%Y-%m-%d %H:%M')"
    fi
  fi

  # Add & commit
  git add -A
  git commit -m "$MSG"
  echo -e "${GREEN}✅ Committed: $MSG${NC}"
fi

# Push to source repo (origin)
echo -e "\n${YELLOW}📤 Push ke pesantren-absensi...${NC}"
git push origin main 2>&1 && echo -e "${GREEN}✅ Source repo updated${NC}" || echo -e "${RED}❌ Gagal push source${NC}"

# Push to deploy repo
echo -e "\n${YELLOW}📤 Push ke pesantren-deploy...${NC}"
# Check if deploy remote exists
if ! git remote get-url deploy > /dev/null 2>&1; then
  echo -e "${YELLOW}Tambah remote deploy...${NC}"
  git remote add deploy https://github.com/rezaulin/pesantren-deploy.git
fi
git push deploy main --force 2>&1 && echo -e "${GREEN}✅ Deploy repo updated${NC}" || echo -e "${RED}❌ Gagal push deploy${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Deploy selesai!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "Source:  https://github.com/rezaulin/pesantren-absensi"
echo -e "Deploy:  https://github.com/rezaulin/pesantren-deploy"
