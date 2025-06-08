'use client';

import { useState } from 'react';
import Checklist from './Checklist';

interface Ingredient {
  text: string;
  amount?: string;
  unit?: string;
}

interface IngredientChecklistProps {
  ingredients: Ingredient[];
  className?: string;
}

export default function IngredientChecklist({ ingredients, className }: IngredientChecklistProps) {
  const checklistItems = ingredients.map((ingredient, index) => ({
    id: `ingredient-${index}`,
    text: `${ingredient.amount ? `${ingredient.amount} ` : ''}${ingredient.unit ? `${ingredient.unit} ` : ''}${ingredient.text}`,
    checked: false
  }));

  const [items, setItems] = useState(checklistItems);

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
      <Checklist 
        items={items} 
        onChange={setItems}
      />
    </div>
  );
} 