import type { IncomingMessage, ServerResponse } from 'node:http';
import { ComponentCategory, UnitOfMeasure } from '@janitou/common';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleRecipeRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Ingredients list
  if (pathname === '/api/v1/ingredients' && method === 'GET') {
    const ingredientsWithStatus = janitouStore.getIngredients().map((ing) => ({
      ...ing,
      isLowStock: ing.currentStock <= ing.minimumThreshold,
      stockDeficit: ing.currentStock <= ing.minimumThreshold ? Math.max(0, ing.minimumThreshold - ing.currentStock) : 0,
    }));
    sendJson(res, 200, { ingredients: ingredientsWithStatus });
    return true;
  }

  // Stock update
  const ingredientStockMatch = pathname.match(/^\/api\/v1\/ingredients\/([^/]+)\/stock$/);
  if (ingredientStockMatch && method === 'PATCH') {
    const ingredientId = ingredientStockMatch[1];
    const body = await readJsonBody<{ currentStock: number }>(req);
    if (typeof body.currentStock !== 'number' || body.currentStock < 0 || isNaN(body.currentStock)) {
      sendError(res, 400, 'Validation Error', 'currentStock must be a valid positive number.');
      return true;
    }
    const updated = janitouStore.updateIngredientStock(ingredientId, body.currentStock);
    if (!updated) {
      sendError(res, 404, 'Not Found', `Ingrédient '${ingredientId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, { ingredient: updated });
    return true;
  }

  // Recipes list & creation
  if (pathname === '/api/v1/recipes') {
    if (method === 'GET') {
      const recipesWithCosts = janitouStore.getRecipes().map((rec) => {
        const costInfo = janitouStore.calculateRecipeCost(rec.id);
        return {
          ...rec,
          costPerPortion: costInfo.costPerPortion,
          ingredientsCostBreakdown: costInfo.breakdown,
        };
      });
      sendJson(res, 200, { recipes: recipesWithCosts });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        name: string;
        category: ComponentCategory;
        description?: string;
        yieldPortions?: number;
        preparationTimeMinutes?: number;
        allergens?: string[];
        ingredients: { ingredientId: string; quantityPerPortion: number; unit: UnitOfMeasure }[];
      }>(req);

      if (!body.name || !body.category || !Array.isArray(body.ingredients)) {
        sendError(res, 400, 'Validation Error', 'name, category, and ingredients array are required.');
        return true;
      }

      if (body.ingredients.some((i) => typeof i.quantityPerPortion !== 'number' || i.quantityPerPortion <= 0)) {
        sendError(res, 400, 'Validation Error', 'Each ingredient quantityPerPortion must be a positive number.');
        return true;
      }

      const newRecipe = janitouStore.createRecipe({
        name: body.name.trim(),
        category: body.category,
        description: body.description?.trim() || '',
        yieldPortions: body.yieldPortions && body.yieldPortions > 0 ? body.yieldPortions : 1,
        preparationTimeMinutes: body.preparationTimeMinutes && body.preparationTimeMinutes > 0 ? body.preparationTimeMinutes : 30,
        allergens: body.allergens || [],
        ingredients: body.ingredients,
      });

      sendJson(res, 201, { recipe: newRecipe });
      return true;
    }
  }

  // Recipe detail
  const recipeDetailMatch = pathname.match(/^\/api\/v1\/recipes\/([^/]+)$/);
  if (recipeDetailMatch && method === 'GET') {
    const recipeId = recipeDetailMatch[1];
    const recipe = janitouStore.getRecipeById(recipeId);
    if (!recipe) {
      sendError(res, 404, 'Not Found', `Recette '${recipeId}' introuvable.`);
      return true;
    }
    const costInfo = janitouStore.calculateRecipeCost(recipeId);
    sendJson(res, 200, {
      recipe: {
        ...recipe,
        costPerPortion: costInfo.costPerPortion,
        ingredientsCostBreakdown: costInfo.breakdown,
      },
    });
    return true;
  }

  // Pricing simulation
  const recipeSimMatch = pathname.match(/^\/api\/v1\/recipes\/([^/]+)\/pricing-simulation$/);
  if (recipeSimMatch && method === 'GET') {
    const recipeId = recipeSimMatch[1];
    const targetParam = searchParams.get('targetFoodCost');
    const targetPct = targetParam ? parseFloat(targetParam) : 30;

    if (isNaN(targetPct) || targetPct <= 0 || targetPct >= 100) {
      sendError(res, 400, 'Validation Error', 'targetFoodCost must be a percentage between 1 and 99.');
      return true;
    }

    const sim = janitouStore.simulateRecipePricing(recipeId, targetPct);
    if (!sim) {
      sendError(res, 404, 'Not Found', `Recette '${recipeId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, { simulation: sim });
    return true;
  }

  return false;
}
