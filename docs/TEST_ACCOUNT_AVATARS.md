# Test Account Avatars

Avatar URLs and image sources for test user profiles.

---

## 🎨 Avatar Options

### Option 1: UI Avatars (Text-based, No Download Required)

Simple, clean avatars generated from initials:

**Jennifer Martinez:**
```
https://ui-avatars.com/api/?name=Jennifer+Martinez&background=6B46C1&color=fff&size=200&bold=true
```

**Riley Chen:**
```
https://ui-avatars.com/api/?name=Riley+Chen&background=9F7AEA&color=fff&size=200&bold=true
```

**Kate O'Brien:**
```
https://ui-avatars.com/api/?name=Kate+OBrien&background=6B46C1&color=fff&size=200&bold=true
```

**Amelia Thompson:**
```
https://ui-avatars.com/api/?name=Amelia+Thompson&background=9F7AEA&color=fff&size=200&bold=true
```

---

### Option 2: DiceBear (Illustrated Avatars)

Professional illustrated avatars:

**Jennifer Martinez:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer&backgroundColor=6B46C1
```

**Riley Chen:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=9F7AEA
```

**Kate O'Brien:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=Kate&backgroundColor=6B46C1
```

**Amelia Thompson:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=Amelia&backgroundColor=9F7AEA
```

---

### Option 3: Boring Avatars (Geometric/Abstract)

Modern, colorful geometric avatars:

**Jennifer Martinez:**
```
https://source.boringavatars.com/beam/200/Jennifer%20Martinez?colors=6B46C1,9F7AEA,E9D5FF,F3E8FF,FDFCFD
```

**Riley Chen:**
```
https://source.boringavatars.com/beam/200/Riley%20Chen?colors=6B46C1,9F7AEA,E9D5FF,F3E8FF,FDFCFD
```

**Kate O'Brien:**
```
https://source.boringavatars.com/beam/200/Kate%20OBrien?colors=6B46C1,9F7AEA,E9D5FF,F3E8FF,FDFCFD
```

**Amelia Thompson:**
```
https://source.boringavatars.com/beam/200/Amelia%20Thompson?colors=6B46C1,9F7AEA,E9D5FF,F3E8FF,FDFCFD
```

---

### Option 4: RoboHash (Fun Robot Avatars)

Unique robot avatars for each user:

**Jennifer Martinez:**
```
https://robohash.org/jennifer@l4yercak3.com?set=set4&size=200x200&bgset=bg1
```

**Riley Chen:**
```
https://robohash.org/riley@l4yercak3.com?set=set4&size=200x200&bgset=bg1
```

**Kate O'Brien:**
```
https://robohash.org/kate@l4yercak3.com?set=set4&size=200x200&bgset=bg1
```

**Amelia Thompson:**
```
https://robohash.org/amelia@l4yercak3.com?set=set4&size=200x200&bgset=bg1
```

---

## 🎯 Recommended Setup

### For Database/CRM

Use **UI Avatars** (Option 1) - simple, professional, fast:

```typescript
const testUsers = [
  {
    email: "jennifer@l4yercak3.com",
    firstName: "Jennifer",
    lastName: "Martinez",
    avatar: "https://ui-avatars.com/api/?name=Jennifer+Martinez&background=6B46C1&color=fff&size=200&bold=true"
  },
  {
    email: "riley@l4yercak3.com",
    firstName: "Riley",
    lastName: "Chen",
    avatar: "https://ui-avatars.com/api/?name=Riley+Chen&background=9F7AEA&color=fff&size=200&bold=true"
  },
  {
    email: "kate@l4yercak3.com",
    firstName: "Kate",
    lastName: "O'Brien",
    avatar: "https://ui-avatars.com/api/?name=Kate+OBrien&background=6B46C1&color=fff&size=200&bold=true"
  },
  {
    email: "amelia@l4yercak3.com",
    firstName: "Amelia",
    lastName: "Thompson",
    avatar: "https://ui-avatars.com/api/?name=Amelia+Thompson&background=9F7AEA&color=fff&size=200&bold=true"
  }
];
```

### For Skool Profiles

Use **DiceBear** (Option 2) - more personality, professional:

```javascript
const skoolMembers = [
  {
    email: "jennifer@l4yercak3.com",
    name: "Jennifer Martinez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer&backgroundColor=6B46C1"
  },
  {
    email: "riley@l4yercak3.com",
    name: "Riley Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=9F7AEA"
  },
  {
    email: "kate@l4yercak3.com",
    name: "Kate O'Brien",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kate&backgroundColor=6B46C1"
  },
  {
    email: "amelia@l4yercak3.com",
    name: "Amelia Thompson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amelia&backgroundColor=9F7AEA"
  }
];
```

---

## 💾 Download Avatars (Optional)

If you want to host avatars yourself:

```bash
# Create avatars directory
mkdir -p public/avatars

# Download UI Avatars
curl "https://ui-avatars.com/api/?name=Jennifer+Martinez&background=6B46C1&color=fff&size=200&bold=true" -o public/avatars/jennifer.png
curl "https://ui-avatars.com/api/?name=Riley+Chen&background=9F7AEA&color=fff&size=200&bold=true" -o public/avatars/riley.png
curl "https://ui-avatars.com/api/?name=Kate+OBrien&background=6B46C1&color=fff&size=200&bold=true" -o public/avatars/kate.png
curl "https://ui-avatars.com/api/?name=Amelia+Thompson&background=9F7AEA&color=fff&size=200&bold=true" -o public/avatars/amelia.png
```

Then use:
```
/avatars/jennifer.png
/avatars/riley.png
/avatars/kate.png
/avatars/amelia.png
```

---

## 🎨 Avatar Preview

| User | UI Avatars | DiceBear | Boring Avatars | RoboHash |
|------|------------|----------|----------------|----------|
| Jennifer | ![JM](https://ui-avatars.com/api/?name=JM&background=6B46C1&color=fff&size=50) | ![JM](https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer&size=50) | ![JM](https://source.boringavatars.com/beam/50/Jennifer) | ![JM](https://robohash.org/jennifer@l4yercak3.com?set=set4&size=50x50) |
| Riley | ![RC](https://ui-avatars.com/api/?name=RC&background=9F7AEA&color=fff&size=50) | ![RC](https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&size=50) | ![RC](https://source.boringavatars.com/beam/50/Riley) | ![RC](https://robohash.org/riley@l4yercak3.com?set=set4&size=50x50) |
| Kate | ![KO](https://ui-avatars.com/api/?name=KO&background=6B46C1&color=fff&size=50) | ![KO](https://api.dicebear.com/7.x/avataaars/svg?seed=Kate&size=50) | ![KO](https://source.boringavatars.com/beam/50/Kate) | ![KO](https://robohash.org/kate@l4yercak3.com?set=set4&size=50x50) |
| Amelia | ![AT](https://ui-avatars.com/api/?name=AT&background=9F7AEA&color=fff&size=50) | ![AT](https://api.dicebear.com/7.x/avataaars/svg?seed=Amelia&size=50) | ![AT](https://source.boringavatars.com/beam/50/Amelia) | ![AT](https://robohash.org/amelia@l4yercak3.com?set=set4&size=50x50) |

---

## 🔧 Implementation Examples

### React Component

```tsx
interface User {
  email: string;
  firstName: string;
  lastName: string;
}

function UserAvatar({ user, size = 40 }: { user: User; size?: number }) {
  const name = `${user.firstName}+${user.lastName}`;
  const avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=6B46C1&color=fff&size=${size}&bold=true`;

  return (
    <img
      src={avatarUrl}
      alt={`${user.firstName} ${user.lastName}`}
      className="rounded-full"
      width={size}
      height={size}
    />
  );
}
```

### Convex Database

```typescript
// When creating test accounts
await ctx.db.insert("users", {
  email: "jennifer@l4yercak3.com",
  firstName: "Jennifer",
  lastName: "Martinez",
  avatarUrl: "https://ui-avatars.com/api/?name=Jennifer+Martinez&background=6B46C1&color=fff&size=200&bold=true",
  // ... other fields
});
```

---

## ✅ Quick Setup Checklist

- [ ] Choose avatar style (recommended: UI Avatars for simplicity)
- [ ] Add avatar URLs to test account creation script
- [ ] Test avatars display correctly in UI
- [ ] Update Skool profiles with avatars
- [ ] Use in CRM contact cards
- [ ] Include in Zapier test data

---

## 🎯 Color Scheme

All avatars use l4yercak3 brand colors:
- **Primary Purple:** `#6B46C1` (Jennifer, Kate)
- **Secondary Purple:** `#9F7AEA` (Riley, Amelia)
- **Text:** White (`#fff`)

This keeps branding consistent across all test profiles!
