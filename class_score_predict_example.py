"""
Class Score Prediction Example
===============================
Predicts final exam scores based on midterm exam scores using Linear Regression.

This example demonstrates:
- Loading score data
- Training a linear regression model
- Making predictions for new students
- Visualizing the relationship between midterm and final scores
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib.pyplot as plt

print("="*60)
print("📚 Class Score Prediction - Linear Regression Demo")
print("="*60)

# ========================================
# Step 1: Create Sample Score Data
# ========================================
print("\n📊 Step 1: Generating sample student score data...")

np.random.seed(42)
n_students = 100

# Generate midterm scores (40-100 range)
midterm_scores = np.random.uniform(40, 100, n_students)

# Final scores are correlated with midterm scores plus some noise
# Formula: final_score ≈ 0.8 * midterm + 15 + noise
final_scores = 0.8 * midterm_scores + 15 + np.random.normal(0, 5, n_students)

# Clip final scores to valid range (0-100)
final_scores = np.clip(final_scores, 0, 100)

# Create DataFrame
data = pd.DataFrame({
    'midterm_score': midterm_scores,
    'final_score': final_scores
})

print(f"✅ Generated data for {n_students} students")
print("\n📋 Sample data:")
print(data.head(10))
print(f"\nMidterm scores - Mean: {data['midterm_score'].mean():.2f}, Std: {data['midterm_score'].std():.2f}")
print(f"Final scores   - Mean: {data['final_score'].mean():.2f}, Std: {data['final_score'].std():.2f}")

# ========================================
# Step 2: Train/Test Split
# ========================================
print("\n" + "="*60)
print("✂️ Step 2: Splitting data into train and test sets")
print("="*60)

X = data[['midterm_score']]  # Features (must be 2D for sklearn)
y = data['final_score']       # Target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"✅ Training set: {len(X_train)} students")
print(f"✅ Test set: {len(X_test)} students")

# ========================================
# Step 3: Train Linear Regression Model
# ========================================
print("\n" + "="*60)
print("🎓 Step 3: Training Linear Regression Model")
print("="*60)

model = LinearRegression()
model.fit(X_train, y_train)

# Extract model parameters
slope = model.coef_[0]
intercept = model.intercept_

print(f"✅ Model trained successfully!")
print(f"\n📐 Model equation: final_score = {slope:.4f} * midterm_score + {intercept:.4f}")
print(f"\nInterpretation:")
print(f"  - For every 1 point increase in midterm score,")
print(f"    final score increases by {slope:.4f} points")
print(f"  - Base final score (when midterm=0): {intercept:.4f}")

# ========================================
# Step 4: Make Predictions
# ========================================
print("\n" + "="*60)
print("🔮 Step 4: Making Predictions")
print("="*60)

# Predictions on test set
y_pred = model.predict(X_test)

print(f"✅ Predictions made for {len(y_pred)} test students")
print("\n📊 Sample predictions:")
comparison = pd.DataFrame({
    'Midterm': X_test['midterm_score'].values[:10],
    'Actual Final': y_test.values[:10],
    'Predicted Final': y_pred[:10],
    'Error': (y_test.values[:10] - y_pred[:10])
})
print(comparison.to_string(index=False))

# ========================================
# Step 5: Evaluate Model
# ========================================
print("\n" + "="*60)
print("📊 Step 5: Model Evaluation")
print("="*60)

mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\n✅ Model Performance Metrics:")
print(f"  - R² Score (coefficient of determination): {r2:.4f}")
print(f"    → Explains {r2*100:.2f}% of variance in final scores")
print(f"  - Mean Absolute Error (MAE): {mae:.4f} points")
print(f"    → On average, predictions are off by {mae:.2f} points")
print(f"  - Root Mean Squared Error (RMSE): {rmse:.4f} points")
print(f"    → Typical prediction error is {rmse:.2f} points")

if r2 > 0.8:
    print("\n🎯 Excellent model! Strong correlation between midterm and final scores.")
elif r2 > 0.6:
    print("\n👍 Good model! Reasonable correlation between midterm and final scores.")
else:
    print("\n⚠️ Moderate model. Consider adding more features.")

# ========================================
# Step 6: Predict Scores for New Students
# ========================================
print("\n" + "="*60)
print("🆕 Step 6: Predicting Scores for New Students")
print("="*60)

# New students with their midterm scores
new_students = pd.DataFrame({
    'student_id': ['A', 'B', 'C', 'D', 'E'],
    'midterm_score': [95, 75, 60, 85, 50]
})

# Make predictions
new_students['predicted_final'] = model.predict(new_students[['midterm_score']])

print("\n📝 Predictions for new students:")
print(new_students.to_string(index=False))

# ========================================
# Step 7: Visualize Results
# ========================================
print("\n" + "="*60)
print("📈 Step 7: Creating Visualization")
print("="*60)

plt.figure(figsize=(12, 5))

# Plot 1: Training data with regression line
plt.subplot(1, 2, 1)
plt.scatter(X_train, y_train, alpha=0.5, label='Training data')
plt.scatter(X_test, y_test, alpha=0.5, color='orange', label='Test data')

# Plot regression line
x_line = np.linspace(X['midterm_score'].min(), X['midterm_score'].max(), 100)
y_line = slope * x_line + intercept
plt.plot(x_line, y_line, 'r-', linewidth=2, label=f'y = {slope:.2f}x + {intercept:.2f}')

plt.xlabel('Midterm Score')
plt.ylabel('Final Score')
plt.title('Score Prediction Model')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 2: Prediction vs Actual
plt.subplot(1, 2, 2)
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', linewidth=2, label='Perfect prediction')
plt.xlabel('Actual Final Score')
plt.ylabel('Predicted Final Score')
plt.title(f'Prediction Quality (R² = {r2:.3f})')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout()

# Save the plot
output_file = 'score_prediction_results.png'
plt.savefig(output_file, dpi=100, bbox_inches='tight')
print(f"\n✅ Visualization saved to: {output_file}")
print("   You can view the plot to see the relationship between midterm and final scores.")

# ========================================
# Step 8: Interactive Prediction
# ========================================
print("\n" + "="*60)
print("🎮 Step 8: Interactive Prediction")
print("="*60)

print("\nYou can predict final scores for any midterm score:")
print("Example usage:")
print("  >>> midterm = 80")
print(f"  >>> predicted_final = model.predict([[midterm]])[0]")
print(f"  >>> print(f'Predicted final score: {{predicted_final:.2f}}')")

# Demonstrate
example_midterm = 80
example_final = model.predict([[example_midterm]])[0]
print(f"\n📝 Example: If a student scores {example_midterm} on midterm,")
print(f"   predicted final score: {example_final:.2f}")

# ========================================
# Summary
# ========================================
print("\n" + "="*60)
print("🎉 Score Prediction Pipeline Complete!")
print("="*60)

print("\n✅ What we accomplished:")
print("  1. Generated realistic student score data")
print("  2. Split data into training and test sets")
print("  3. Trained a Linear Regression model")
print("  4. Made predictions on test data")
print("  5. Evaluated model performance")
print("  6. Predicted scores for new students")
print("  7. Created visualizations")

print("\n📚 Key Insights:")
print(f"  - Model accuracy (R²): {r2:.2%}")
print(f"  - Average prediction error: ±{mae:.2f} points")
print(f"  - Relationship: final ≈ {slope:.2f} × midterm + {intercept:.2f}")

print("\n💡 This pipeline can be created in the Visual ML Pipeline Builder")
print("   by connecting these nodes:")
print("   DataLoader → DataSplit → Regressor (LinearRegression) → Evaluate → Predict")

print("\n" + "="*60)
