from typing import List
from ..models import AdminUser

PERMISSION_MATRIX = {
    "admin": ["*"],
    "wehrfuehrer": [
        "personnel:*",
        "sessions:*",
        "reports:export",
        "backup:create",
        "settings:*",
        "announcements:*",
        "groups:*",
        "trainings:*"
    ],
    "gruppenfuehrer": [
        "personnel:read",
        "sessions:end",
        "reports:export",
        "announcements:read"
    ],
    "mitglied": [
        "personnel:read:own",
        "attendance:read:own"
    ]
}

def has_permission(user: AdminUser, permission: str) -> bool:
    """Check if user has a specific permission"""
    if not user:
        return False
    
    user_permissions = PERMISSION_MATRIX.get(user.role, [])
    
    # Admin has all permissions
    if "*" in user_permissions:
        return True
    
    # Check exact match
    if permission in user_permissions:
        return True
    
    # Check wildcard match (e.g., "personnel:*" matches "personnel:read")
    for perm in user_permissions:
        if perm.endswith(":*"):
            prefix = perm[:-2]
            if permission.startswith(prefix):
                return True
    
    return False

def check_permission(user: AdminUser, permission: str):
    """Raise exception if user doesn't have permission"""
    if not has_permission(user, permission):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Keine Berechtigung für: {permission}"
        )
