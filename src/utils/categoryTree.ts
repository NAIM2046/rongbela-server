// utils/categoryTree.ts

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: Category[];
}

export const buildCategoryTree = (categories: Category[]): Category[] => {
  const categoryMap: { [key: string]: Category } = {};
  const roots: Category[] = [];

  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parentId && categoryMap[cat.parentId]) {
      categoryMap[cat.parentId].children!.push(categoryMap[cat.id]);
    } else {
      roots.push(categoryMap[cat.id]);
    }
  });

  return roots;
};
