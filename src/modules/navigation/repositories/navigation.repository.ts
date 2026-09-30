import { db } from "../../../prisma/db.js";

const menuSelect = ["id", "name", "key", "isActive", "createdAt", "updatedAt"] as const;
const itemSelect = ["id", "menuId", "label", "type", "url", "categoryId", "sortOrder", "isActive", "openNewTab", "createdAt", "updatedAt"] as const;

export const findMenu = (id: number) => db.orm.public.NavigationMenu.select(...menuSelect).first({ id });
export const findMenuByKey = (key: string) => db.orm.public.NavigationMenu.select(...menuSelect).first({ key });
export const listMenus = () => db.orm.public.NavigationMenu.select(...menuSelect).orderBy((m) => m.name.asc()).all();
export const createMenu = (data: any) => db.orm.public.NavigationMenu.select(...menuSelect).create(data);
export const updateMenu = (id: number, data: any) => db.orm.public.NavigationMenu.where({ id }).select(...menuSelect).update(data);
export const removeMenu = (id: number) => db.orm.public.NavigationMenu.where({ id }).delete();

export const findItem = (menuId: number, id: number) => db.orm.public.NavigationItem.select(...itemSelect).first({ menuId, id });
export const listItems = (menuId: number) => db.orm.public.NavigationItem.select(...itemSelect).where({ menuId }).orderBy([(i) => i.sortOrder.asc(), (i) => i.id.asc()]).all();
export const createItem = (data: any) => db.orm.public.NavigationItem.select(...itemSelect).create(data);
export const updateItem = (menuId: number, id: number, data: any) => db.orm.public.NavigationItem.where({ menuId, id }).select(...itemSelect).update(data);
export const removeItem = (menuId: number, id: number) => db.orm.public.NavigationItem.where({ menuId, id }).delete();
export const findCategory = (id: number) => db.orm.public.Category.select("id", "isActive").first({ id });
export const findProduct = (id: number) => db.orm.public.Product.select("id", "status").first({ id });
const sectionSelect = ["id", "itemId", "title", "sortOrder", "isActive", "createdAt", "updatedAt"] as const;
const entrySelect = ["id", "sectionId", "label", "type", "url", "categoryId", "productId", "sortOrder", "isActive", "openNewTab", "createdAt", "updatedAt"] as const;
export const findSection = (itemId: number, id: number) => db.orm.public.NavigationSection.select(...sectionSelect).first({ itemId, id });
export const listSections = (itemId: number) => db.orm.public.NavigationSection.select(...sectionSelect).where({ itemId }).orderBy([(s) => s.sortOrder.asc(), (s) => s.id.asc()]).all();
export const createSection = (data: any) => db.orm.public.NavigationSection.select(...sectionSelect).create(data);
export const updateSection = (itemId: number, id: number, data: any) => db.orm.public.NavigationSection.where({ itemId, id }).select(...sectionSelect).update(data);
export const removeSection = (itemId: number, id: number) => db.orm.public.NavigationSection.where({ itemId, id }).delete();
export const findEntry = (sectionId: number, id: number) => db.orm.public.NavigationEntry.select(...entrySelect).first({ sectionId, id });
export const listEntries = (sectionId: number) => db.orm.public.NavigationEntry.select(...entrySelect).where({ sectionId }).orderBy([(e) => e.sortOrder.asc(), (e) => e.id.asc()]).all();
export const createEntry = (data: any) => db.orm.public.NavigationEntry.select(...entrySelect).create(data);
export const updateEntry = (sectionId: number, id: number, data: any) => db.orm.public.NavigationEntry.where({ sectionId, id }).select(...entrySelect).update(data);
export const removeEntry = (sectionId: number, id: number) => db.orm.public.NavigationEntry.where({ sectionId, id }).delete();
