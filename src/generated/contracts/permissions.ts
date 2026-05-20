// AUTO-GENERATED from contracts/source. Do not edit.

export const PERMISSIONS = {
  "public": {
    "kind": "public",
    "description": "Accessible without authentication."
  },
  "authenticated": {
    "kind": "authenticated",
    "description": "Any logged-in WordPress user."
  },
  "read": {
    "kind": "capability",
    "capability": "read",
    "description": "Any user with the WordPress read capability."
  },
  "manage_options": {
    "kind": "capability",
    "capability": "manage_options",
    "description": "Administrators or roles with manage_options."
  }
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
