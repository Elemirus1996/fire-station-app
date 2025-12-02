import os
import shutil
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple
import re

class BackupManager:
    @staticmethod
    def validate_backup_path(path: str) -> Tuple[bool, str]:
        """Validate backup path (Windows/Linux/Network/Relative)"""
        if not path or path.strip() == "":
            return False, "Backup-Pfad darf nicht leer sein"
        
        path = path.strip()
        
        # Check for invalid characters
        invalid_chars = ['<', '>', '"', '|', '\x00']
        if any(char in path for char in invalid_chars):
            return False, "Ungültige Zeichen im Pfad"
        
        try:
            # Try to create directory if it doesn't exist
            backup_dir = Path(path)
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Test write access
            test_file = backup_dir / ".test_write"
            test_file.touch()
            test_file.unlink()
            
            return True, "Pfad ist gültig und beschreibbar"
        except PermissionError:
            return False, "Keine Schreibberechtigung für diesen Pfad"
        except Exception as e:
            return False, f"Fehler beim Validieren des Pfads: {str(e)}"
    
    @staticmethod
    def create_backup(backup_path: str, db_path: str = "./fire_station.db", 
                     uploads_dir: str = "./uploads") -> Tuple[bool, str]:
        """Create backup ZIP with database and uploads"""
        try:
            backup_dir = Path(backup_path)
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{timestamp}.zip"
            backup_file_path = backup_dir / backup_filename
            
            with zipfile.ZipFile(backup_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add database
                if os.path.exists(db_path):
                    zipf.write(db_path, "fire_station.db")
                
                # Add uploads directory
                if os.path.exists(uploads_dir):
                    for root, dirs, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, os.path.dirname(uploads_dir))
                            zipf.write(file_path, arcname)
            
            return True, backup_filename
        except Exception as e:
            return False, f"Fehler beim Erstellen des Backups: {str(e)}"
    
    @staticmethod
    def list_backups(backup_path: str) -> List[dict]:
        """List all backups in backup directory"""
        try:
            backup_dir = Path(backup_path)
            if not backup_dir.exists():
                return []
            
            backups = []
            for file in backup_dir.glob("backup_*.zip"):
                stat = file.stat()
                backups.append({
                    "filename": file.name,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "path": str(file)
                })
            
            # Sort by creation date, newest first
            backups.sort(key=lambda x: x["created_at"], reverse=True)
            return backups
        except Exception as e:
            return []
    
    @staticmethod
    def delete_old_backups(backup_path: str, retention_days: int) -> int:
        """Delete backups older than retention_days"""
        try:
            backup_dir = Path(backup_path)
            if not backup_dir.exists():
                return 0
            
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            deleted_count = 0
            
            for file in backup_dir.glob("backup_*.zip"):
                stat = file.stat()
                file_date = datetime.fromtimestamp(stat.st_mtime)
                
                if file_date < cutoff_date:
                    file.unlink()
                    deleted_count += 1
            
            return deleted_count
        except Exception as e:
            return 0
    
    @staticmethod
    def restore_backup(backup_file: str, db_path: str = "./fire_station.db",
                      uploads_dir: str = "./uploads") -> Tuple[bool, str]:
        """Restore from backup ZIP"""
        try:
            if not os.path.exists(backup_file):
                return False, "Backup-Datei nicht gefunden"
            
            # Create backup of current database
            if os.path.exists(db_path):
                backup_current = f"{db_path}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.copy2(db_path, backup_current)
            
            # Extract backup
            with zipfile.ZipFile(backup_file, 'r') as zipf:
                zipf.extractall("./")
            
            return True, "Backup erfolgreich wiederhergestellt"
        except Exception as e:
            return False, f"Fehler beim Wiederherstellen: {str(e)}"
    
    @staticmethod
    def delete_backup(backup_path: str, filename: str) -> Tuple[bool, str]:
        """Delete a specific backup file"""
        try:
            backup_dir = Path(backup_path)
            file_path = backup_dir / filename
            
            if not file_path.exists():
                return False, "Backup-Datei nicht gefunden"
            
            # Security check: ensure filename matches backup pattern
            if not re.match(r'^backup_\d{8}_\d{6}\.zip$', filename):
                return False, "Ungültiger Dateiname"
            
            file_path.unlink()
            return True, "Backup gelöscht"
        except Exception as e:
            return False, f"Fehler beim Löschen: {str(e)}"
