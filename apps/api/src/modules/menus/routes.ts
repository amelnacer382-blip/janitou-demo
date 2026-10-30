import type { IncomingMessage, ServerResponse } from 'node:http';
import { MealServiceTime } from '@janitou/common';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleMenuRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Weekly Calendar
  if (pathname === '/api/v1/meal-plans/weekly' && method === 'GET') {
    const startDate = searchParams.get('startDate') || undefined;
    const weekly = janitouStore.getWeeklyMenuPlan(startDate);
    sendJson(res, 200, { weekly });
    return true;
  }

  // Validate Menu Rules
  if (pathname === '/api/v1/meal-plans/validate-rules' && method === 'GET') {
    const validation = janitouStore.validateMenuCalendarRules();
    sendJson(res, 200, validation);
    return true;
  }

  // Meal Plans list & creation
  if (pathname === '/api/v1/meal-plans') {
    if (method === 'GET') {
      const date = searchParams.get('date') || undefined;
      sendJson(res, 200, { mealPlans: janitouStore.getMealPlans(date) });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        date: string;
        serviceTime: MealServiceTime;
        starterRecipeId?: string;
        mainCourseRecipeId: string;
        sideDishRecipeId?: string;
        dessertRecipeId?: string;
        notes?: string;
      }>(req);

      if (!body.date || !body.serviceTime || !body.mainCourseRecipeId) {
        sendError(
          res,
          400,
          'Validation Error',
          'date, serviceTime, and mainCourseRecipeId are required.'
        );
        return true;
      }

      const mealPlan = janitouStore.createMealPlan({
        date: body.date,
        serviceTime: body.serviceTime,
        starterRecipeId: body.starterRecipeId,
        mainCourseRecipeId: body.mainCourseRecipeId,
        sideDishRecipeId: body.sideDishRecipeId,
        dessertRecipeId: body.dessertRecipeId,
        notes: body.notes?.trim(),
      });

      sendJson(res, 201, { mealPlan });
      return true;
    }
  }

  return false;
}
