export interface SubMenuItem {
  label: string;
  slug: string;
  count?: number | null;
  cap?: string;
}

export interface MenuItem {
  label: string;
  slug: string;
  icon?: string;
  count?: number | null;
  cap?: string;
  children?: SubMenuItem[];
}
