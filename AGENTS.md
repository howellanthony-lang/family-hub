# Family Hub Agent Instructions

This is the Raspberry Pi Family Hub project.

Do not SSH into the Raspberry Pi directly. Instead, create safe, reviewable Pi deployment scripts and ask the user to run them on the Pi.

Never print `.env` or secrets. Do not commit `.env`, `node_modules`, `apps/api/data`, `apps/ui/dist`, backup files, or nano temp files.

Keep Raspberry Pi deployment simple and repeatable:

```bash
git pull
bash scripts/pi-deploy.sh
sudo reboot
```

Useful local Pi scripts:

- `scripts/pi-verify.sh`
- `scripts/pi-deploy.sh`
- `scripts/pi-repair-api-url.sh`
