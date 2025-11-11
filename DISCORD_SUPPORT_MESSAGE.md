# Discord Support Message

**Copy and paste this into the LiquidMetal AI Discord:**

---

## 🚨 URGENT: Deployment Blocked by Phantom Version

**Project:** HakiVo (civic-pulse)
**Issue:** Cannot deploy due to phantom version stuck in "branching" state
**Context:** Liquid Metal Hackathon project - deadline approaching

### Error
```
[internal] Application civic-pulse@01k9qgfw0ekhnza2rpwmry7k6z is currently branching from this version, please wait until it deploys
```

### Details
- **Current Version:** `01k8kf2b9x7snxw0gya5zfvmya` (running)
- **Phantom Version:** `01k9qgfw0ekhnza2rpwmry7k6z` (not visible in `raindrop build list` but blocks all deployments)
- **Service URL:** https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run

### What I've Tried
- ✅ `raindrop build deploy --amend` - FAILS with phantom version error
- ✅ `raindrop build deploy --start` - FAILS with same error
- ✅ `raindrop build stop` then deploy - FAILS
- ✅ `raindrop build list` - Phantom version NOT shown
- ✅ `raindrop build delete 01k9qgfw...` - Version not found
- ✅ Waited 30+ minutes - Issue persists

### Impact
**Completely blocked** from deploying any code updates. Cannot:
- Update admin-api to add `news_articles` table to whitelist
- Create required database table in remote CIVIC_DB
- Fix broken personalized news dashboard feature
- Deploy ANY changes to production

### Request
Can you please:
1. Clear the phantom version `01k9qgfw0ekhnza2rpwmry7k6z` from the backend?
2. Unlock the application from "locked state"?
3. Allow me to proceed with deployment?

### Documentation
Full details in attached file: `RAINDROP_SUPPORT_ISSUE.md`
- Complete error logs
- All troubleshooting attempts
- Insights from official Raindrop docs
- Specific questions about locked state and branching

**Time Sensitive:** This is blocking my hackathon submission. Any help would be greatly appreciated! 🙏

---

**Discord Invite:** https://discord.gg/wh8Q6Zx8pu

**Files to Attach:**
1. `RAINDROP_SUPPORT_ISSUE.md` (comprehensive support request)
2. `DEPLOYMENT_STATUS.md` (current status overview)
