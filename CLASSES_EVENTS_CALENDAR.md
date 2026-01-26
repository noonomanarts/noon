# Classes, Events, and Calendar System

## Overview

سیستم جامع مدیریت کلاس‌ها، ایونت‌ها و تقویم در Noon با قابلیت‌های زیر پیاده‌سازی شده است:

### ✅ قابلیت‌های پیاده‌سازی شده

## 1. Database Schema (Prisma)

### Models ایجاد شده:

#### کلاس‌ها (Classes)
- `Class`: اطلاعات اصلی کلاس (عنوان، توضیحات، دسته‌بندی، قیمت، ظرفیت)
- `ClassSession`: جلسات کلاس با تاریخ و ساعت مشخص
- `ClassCategory`: COOKING, ARTS_CRAFTS
- `ClassSubCategory`: مثل APPETIZERS_SNACKS, MAIN_DISHES, DESSERTS_BAKING, MOM_AND_KID
- `ClassStatus`: DRAFT, PUBLISHED, CANCELLED, COMPLETED

#### ایونت‌ها (Events)
- `EventBooking`: رزرو ایونت‌ها (مسابقه آشپزی، کلاس خصوصی، جشن تولد)
- `EventType`: COOKING_COMPETITION, PRIVATE_CLASS, BIRTHDAY_PARTY
- `EventStatus`: NEW, IN_PROGRESS, PENDING_CLIENT_CONFIRMATION, CLIENT_CONFIRMED, PENDING_PAYMENT, COMPLETED, CANCELLED
- `PackageType`: STANDARD, PREMIUM

#### تقویم (Calendar)
- `CalendarEvent`: رویدادهای تقویم (کلاس، ایونت، بلوک شده، تمیزکاری)
- `CalendarEventType`: CLASS, PRIVATE_SESSION, COMPETITION, BIRTHDAY_PARTY, BLOCKED, CLEANING
- **قابلیت خاص**: بعد از هر کلاس آشپزی، به صورت خودکار 3 ساعت بلوک تمیزکاری اضافه می‌شود

#### Bookings
- `Booking`: رزرو کلاس‌ها توسط مشتریان
- `BookingStatus`: PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
- `PaymentMethod`: ONLINE, BANK_TRANSFER, CASH, WALLET
- `PaymentStatus`: PENDING, PAID, REFUNDED, FAILED

#### سایر
- `Review`: نظرات مشتریان درباره کلاس‌ها
- `Wallet` & `WalletTransaction`: کیف پول مشتری (برای استرداد وجه)
- `LoyaltyCard`: کارت وفاداری
- `TrainerProfile`: پروفایل مربی

## 2. API Routes

### Admin APIs - Classes

#### `GET /api/admin/classes`
- لیست تمام کلاس‌ها با فیلتر و pagination
- Params: `category`, `status`, `page`, `limit`

#### `POST /api/admin/classes`
- ایجاد کلاس جدید
- تولید خودکار slug از عنوان
- بررسی وجود مربی

#### `GET /api/admin/classes/[classId]`
- جزئیات یک کلاس با sessions و reviews

#### `PUT /api/admin/classes/[classId]`
- به‌روزرسانی کلاس

#### `DELETE /api/admin/classes/[classId]`
- حذف کلاس (فقط اگر booking نداشته باشد)

#### `GET /api/admin/classes/[classId]/sessions`
- لیست sessions یک کلاس

#### `POST /api/admin/classes/[classId]/sessions`
- ایجاد session جدید برای کلاس
- ایجاد خودکار رویداد تقویم
- **اضافه کردن خودکار 3 ساعت بلوک تمیزکاری برای کلاس‌های آشپزی**

### Admin APIs - Events

#### `GET /api/admin/events`
- لیست تمام event bookings
- Params: `eventType`, `status`, `page`, `limit`

#### `POST /api/admin/events`
- ایجاد event booking دستی توسط ادمین
- تولید خودکار booking number

#### `GET /api/admin/events/[eventId]`
- جزئیات یک event

#### `PUT /api/admin/events/[eventId]`
- به‌روزرسانی event
- وقتی status به CLIENT_CONFIRMED تغییر کند، خودکار به تقویم اضافه می‌شود
- **اضافه کردن خودکار 3 ساعت بلوک تمیزکاری برای cooking events**

#### `DELETE /api/admin/events/[eventId]`
- لغو event
- **استرداد خودکار وجه به wallet مشتری**

### Admin APIs - Calendar

#### `GET /api/admin/calendar`
- لیست رویدادهای تقویم
- Params: `startDate`, `endDate`, `type`

#### `POST /api/admin/calendar`
- ایجاد بلوک زمانی (blocked time)
- قابلیت تنظیم دیده شدن برای مربیان خاص

## 3. Admin Panel Pages

### `/[locale]/admin/classes`
- لیست تمام کلاس‌ها با آمار
- فیلتر بر اساس category و status
- جدول اطلاعات کامل
- لینک به مدیریت sessions

### `/[locale]/admin/events`
- لیست تمام event bookings
- آمار بر اساس status
- نمایش اطلاعات مشتری و جزئیات ایونت
- مدیریت status

### `/[locale]/admin/calendar`
- نمایش تقویم ماهانه
- رنگ‌بندی بر اساس نوع رویداد
- لیست رویدادهای آینده
- ایجاد بلوک زمانی

## 4. Public Website Pages

### `/[locale]/classes/cooking`
- نمایش کلاس‌های آشپزی به تفکیک زیرگروه
- کارت کلاس با تصویر، مربی، قیمت
- نمایش جلسه بعدی
- دکمه رزرو

### `/[locale]/classes/arts-crafts`
- نمایش کلاس‌های هنر و صنایع دستی
- مشابه صفحه cooking با رنگ‌بندی متفاوت

### `/[locale]/classes/[slug]`
- صفحه جزئیات کلاس
- تصویر، توضیحات کامل، اطلاعات مربی
- لیست sessions موجود با ظرفیت
- نمایش reviews
- دکمه رزرو برای هر session

## 5. Features خاص پیاده‌سازی شده

### Automatic Cleaning Blocks
بعد از هر کلاس آشپزی یا ایونت آشپزی، به صورت خودکار یک بلوک 3 ساعته برای تمیزکاری ایجاد می‌شود.

### Wallet Refund System
هنگام لغو یک event که پرداخت شده باشد، به صورت خودکار مبلغ به wallet مشتری اضافه می‌شود.

### Slug Generation
برای هر کلاس جدید، slug به صورت خودکار از عنوان تولید می‌شود.

### Capacity Management
سیستم به صورت خودکار ظرفیت را محاسبه و نمایش می‌دهد.

### Multi-language Support
تمام صفحات با پشتیبانی کامل از انگلیسی و عربی (RTL).

## 6. Sample Data

با اجرای `npx tsx prisma/seed.ts` داده‌های نمونه زیر ایجاد می‌شوند:

- کاربر Admin: admin@noon.com / admin123
- کاربر Trainer: trainer@noon.com / trainer123
- کلاس نمونه آشپزی: Italian Pasta Making Masterclass
- کلاس نمونه هنری: Pottery Workshop for Beginners
- Session نمونه با تاریخ 7 روز آینده
- Calendar events و cleaning blocks

## 7. Next Steps

### برای توسعه بیشتر:

1. **صفحه ایجاد/ویرایش کلاس در ادمین**
   - فرم کامل با آپلود تصویر
   - انتخاب مربی
   - تنظیمات SEO

2. **صفحه booking برای مشتریان**
   - فرم ثبت‌نام
   - انتخاب شرکت‌کنندگان
   - پرداخت آنلاین

3. **Dashboard مربی (Trainer Panel)**
   - مشاهده کلاس‌های خود
   - آپلود دستور پخت و مواد اولیه
   - مشاهده شرکت‌کنندگان

4. **Email & WhatsApp Notifications**
   - تایید رزرو
   - یادآوری جلسه
   - لغو کلاس

5. **Review System**
   - فرم ثبت نظر بعد از کلاس
   - تایید نظرات توسط ادمین

6. **Advanced Calendar Features**
   - Drag & drop برای تغییر زمان
   - Recurring events
   - Export to iCal/Google Calendar

## 8. Testing

برای تست سیستم:

```bash
# Start development server
npm run dev

# Admin panel
http://localhost:3000/en/admin/classes
http://localhost:3000/en/admin/events
http://localhost:3000/en/admin/calendar

# Public pages
http://localhost:3000/en/classes/cooking
http://localhost:3000/en/classes/arts-crafts
http://localhost:3000/en/classes/italian-pasta-making
```

## 9. Database Commands

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Generate Prisma Client
npx prisma generate

# Seed database
npx tsx prisma/seed.ts

# Open Prisma Studio
npx prisma studio
```

---

**تاریخ ایجاد:** 26 January 2026
**نسخه:** 1.0.0
