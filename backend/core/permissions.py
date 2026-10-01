from rest_framework.permissions import BasePermission

from .services import ROLE_ACTIONS, role


class HasAssignedRole(BasePermission):
    """Require a real, recognized role for every authenticated API request."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and role(request.user) in ROLE_ACTIONS)
