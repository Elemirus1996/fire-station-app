from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import subprocess
import os
import sys
from datetime import datetime
from ..database import get_db
from ..models import AdminUser, SystemSettings
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/system", tags=["system"])

class UpdateResponse(BaseModel):
    success: bool
    message: str
    current_version: Optional[str] = None
    new_version: Optional[str] = None
    output: Optional[str] = None

class VersionInfo(BaseModel):
    current_version: str
    current_commit: str
    remote_available: bool
    updates_available: bool
    remote_commit: Optional[str] = None
    last_check: str

def get_git_version():
    """Get current git version/commit"""
    try:
        commit = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            stderr=subprocess.STDOUT
        ).decode().strip()
        
        # Try to get tag
        try:
            tag = subprocess.check_output(
                ['git', 'describe', '--tags', '--exact-match'],
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                stderr=subprocess.STDOUT
            ).decode().strip()
            return f"{tag} ({commit})"
        except:
            return commit
    except Exception as e:
        return "unknown"

def check_for_updates():
    """Check if updates are available"""
    try:
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        
        # Fetch latest from remote
        subprocess.run(
            ['git', 'fetch', 'origin'],
            cwd=project_dir,
            check=True,
            capture_output=True
        )
        
        # Get current commit
        current = subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'],
            cwd=project_dir
        ).decode().strip()
        
        # Get remote commit
        remote = subprocess.check_output(
            ['git', 'rev-parse', 'origin/main'],
            cwd=project_dir
        ).decode().strip()
        
        return {
            'available': current != remote,
            'current': current[:7],
            'remote': remote[:7]
        }
    except Exception as e:
        return {
            'available': False,
            'current': 'unknown',
            'remote': 'unknown',
            'error': str(e)
        }

@router.get("/version", response_model=VersionInfo)
async def get_version_info(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get current version and check for updates"""
    check_permission(current_user, "settings:read")
    
    current_version = get_git_version()
    update_check = check_for_updates()
    
    return VersionInfo(
        current_version=current_version,
        current_commit=update_check['current'],
        remote_available=True,
        updates_available=update_check['available'],
        remote_commit=update_check.get('remote'),
        last_check=datetime.now().isoformat()
    )

@router.post("/update", response_model=UpdateResponse)
async def perform_update(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Perform system update (git pull + rebuild)"""
    check_permission(current_user, "settings:update")
    
    try:
        # Use /opt/feuerwehr-app as base directory
        project_dir = '/opt/feuerwehr-app'
        if not os.path.exists(project_dir):
            # Fallback to current directory structure
            project_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        
        output_lines = []
        
        # 1. Git pull
        output_lines.append("=== Git Pull ===")
        result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=project_dir,
            capture_output=True,
            text=True
        )
        output_lines.append(result.stdout)
        if result.returncode != 0:
            return UpdateResponse(
                success=False,
                message="Git pull fehlgeschlagen",
                output="\n".join(output_lines) + "\nError: " + result.stderr
            )
        
        # 2. Backend: Install dependencies
        output_lines.append("\n=== Backend Dependencies ===")
        venv_python = os.path.join(project_dir, 'backend', 'venv', 'bin', 'python3')
        if os.path.exists(venv_python):
            result = subprocess.run(
                [venv_python, '-m', 'pip', 'install', '-r', 'requirements.txt'],
                cwd=os.path.join(project_dir, 'backend'),
                capture_output=True,
                text=True
            )
            output_lines.append(result.stdout[:500])  # Limit output
        
        # 3. Frontend: Install and rebuild
        frontend_dir = os.path.join(project_dir, 'frontend')
        
        output_lines.append("\n=== Frontend Dependencies ===")
        result = subprocess.run(
            ['npm', 'install'],
            cwd=frontend_dir,
            capture_output=True,
            text=True
        )
        output_lines.append("npm install completed")
        
        output_lines.append("\n=== Frontend Build ===")
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=frontend_dir,
            capture_output=True,
            text=True
        )
        output_lines.append("npm build completed")
        
        if result.returncode != 0:
            return UpdateResponse(
                success=False,
                message="Frontend build fehlgeschlagen",
                output="\n".join(output_lines) + "\nError: " + result.stderr[:500]
            )
        
        # 4. Restart services (if systemd)
        output_lines.append("\n=== Service Restart ===")
        try:
            subprocess.run(['sudo', 'systemctl', 'restart', 'fire-station-backend'], check=False)
            subprocess.run(['sudo', 'systemctl', 'restart', 'fire-station-frontend'], check=False)
            output_lines.append("Services restarted")
        except:
            output_lines.append("Service restart skipped (not on systemd)")
        
        new_version = get_git_version()
        
        return UpdateResponse(
            success=True,
            message="Update erfolgreich durchgeführt! Services werden neu gestartet.",
            new_version=new_version,
            output="\n".join(output_lines)
        )
        
    except Exception as e:
        return UpdateResponse(
            success=False,
            message=f"Update fehlgeschlagen: {str(e)}",
            output=str(e)
        )

@router.post("/restart")
async def restart_system(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Restart the application"""
    check_permission(current_user, "settings:update")
    
    try:
        # Try to restart systemd services
        subprocess.run(['sudo', 'systemctl', 'restart', 'fire-station-backend'], check=False)
        subprocess.run(['sudo', 'systemctl', 'restart', 'fire-station-frontend'], check=False)
        
        return {"message": "Services werden neu gestartet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neustart fehlgeschlagen: {str(e)}")

@router.post("/reboot")
async def reboot_system(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Reboot the entire system (Raspberry Pi)"""
    check_permission(current_user, "settings:update")
    
    try:
        # Schedule system reboot immediately
        subprocess.Popen(['sudo', 'shutdown', '-r', 'now'])
        
        return {"message": "System wird neu gestartet..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reboot fehlgeschlagen: {str(e)}")

@router.get("/health")
async def reboot_system(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Reboot the entire system (Raspberry Pi)"""
    check_permission(current_user, "settings:update")
    
    try:
        # Schedule system reboot in 5 seconds to allow response to be sent
        subprocess.Popen(['sudo', 'shutdown', '-r', '+0'])
        
        return {"message": "System wird neu gestartet..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reboot fehlgeschlagen: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": get_git_version()
    }
