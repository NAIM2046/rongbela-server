import { Category } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import { buildCategoryTree } from "../../../utils/categoryTree";
import ApiError from "../../error/ApiError";

export interface ICreateCategory {
  name: string;
  description?: string;
  parentId?: string | null;
  image?: string;
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0980-\u09FF-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
};
const createCategory = async (payload: ICreateCategory) => {
  const slug = generateSlug(payload.name);
  const existingCategory = await prisma.category.findUnique({
    where: {
      slug: slug,
    },
  });
  if (existingCategory) {
    throw new ApiError(400, "Category with this name already exists!");
  }
  let level = 0;
  if (payload.parentId) {
    const parent = await prisma.category.findUnique({
      where: {
        id: payload.parentId,
      },
    });
    //  console.log(parent)
    if (!parent) {
      throw new ApiError(404, "Parent category not found!");
    }
    level = parent.level + 1;
  }
  const result = await prisma.category.create({
    data: {
      name: payload.name,
      slug: slug,
      description: payload.description,
      image: payload.image,

      parentId: payload.parentId || null,
      level: level,
      isActive: true,
    },
  });
  return result;
};

const getAllCategories = async () => {
  try {
    const allCategories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        slug: "asc",
      },
    });

    if (!allCategories || allCategories.length === 0) {
      return [];
    }

    const categoryTree = buildCategoryTree(allCategories);

    return categoryTree;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};
const getAllCategoriesForHomePage = async () => {
  try {
    const allCategories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        slug: "asc",
      },
    });

    if (!allCategories || allCategories.length === 0) {
      return [];
    }

    const categoryTree = buildCategoryTree(allCategories);

    return categoryTree;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};
const getCategoryById = async (id: string) => {
  const result = await prisma.category.findUnique({
    where: { id },
    include: { parent: true, children: true },
  });

  if (!result) throw new Error("Category not found");
  return result;
};
const updateCategory = async (id: string, payload: Partial<Category>) => {
  const existingCategory = await prisma.category.findUnique({ where: { id } });
  if (!existingCategory) throw new Error("Category not found");

  const updates: any = { ...payload };

  if (payload.name && payload.name !== existingCategory.name) {
    updates.slug = generateSlug(payload.name);
  }

  if (payload.parentId && payload.parentId !== existingCategory.parentId) {
    const newParent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!newParent) throw new Error("New parent category not found");

    updates.level = newParent.level + 1;
  } else if (payload.parentId === null) {
    updates.level = 0;
  }

  return await prisma.category.update({
    where: { id },
    data: updates,
  });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: true },
  });

  if (!category) throw new Error("Category not found");

  if (category.children.length > 0) {
    throw new Error("Cannot delete category with existing sub-categories.");
  }

  return await prisma.category.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};
const getFlatCategories = async (): Promise<{ id: string; name: string; slug: string }[]> => {
  try {
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return allCategories;
  } catch (error) {
    console.error("Error fetching flat categories:", error);
    return [];
  }
};

export const productCategoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getAllCategoriesForHomePage,
  getFlatCategories,
};
