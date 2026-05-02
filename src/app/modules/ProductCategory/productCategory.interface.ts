// src/modules/category/category.interface.ts

export interface ICreateCategory {
  name: string;
  description?: string;
  parentId?: string | null; 
  image?: string;
}


export interface ICategoryFilter {
  searchTerm?: string;
}