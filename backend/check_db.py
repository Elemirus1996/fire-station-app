from app.database import SessionLocal
from app.models import SystemSettings, News

db = SessionLocal()

print("=" * 50)
print("SYSTEM SETTINGS CHECK")
print("=" * 50)

settings = db.query(SystemSettings).first()
if settings:
    print(f"✓ Settings gefunden:")
    print(f"  - Screensaver enabled: {settings.screensaver_enabled}")
    print(f"  - Screensaver timeout: {settings.screensaver_timeout}")
    print(f"  - Screensaver show logo: {settings.screensaver_show_logo}")
    print(f"  - Screensaver show clock: {settings.screensaver_show_clock}")
    print(f"  - Kiosk show attendance: {settings.kiosk_show_attendance_list}")
else:
    print("✗ Keine Settings in der Datenbank gefunden!")

print("\n" + "=" * 50)
print("NEWS CHECK")
print("=" * 50)

news = db.query(News).filter(News.is_active == True).all()
print(f"Aktive News: {len(news)}")
for n in news:
    print(f"  - {n.title} (Priorität: {n.priority})")

db.close()
