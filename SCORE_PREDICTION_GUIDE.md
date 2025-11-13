# Score Prediction Example

This guide demonstrates how to use the ML Pipeline Builder to predict final exam scores based on midterm scores using Linear Regression.

## Overview

The score prediction example (`class_score_predict_example.py`) shows a complete workflow for:
1. Loading student score data
2. Training a linear regression model
3. Making predictions for new students
4. Evaluating model performance
5. Visualizing the relationship between midterm and final scores

## Quick Start

### Run the Example

```bash
python3 class_score_predict_example.py
```

This will:
- Generate sample student score data (100 students)
- Train a Linear Regression model
- Evaluate the model with regression metrics (R², MAE, MSE, RMSE)
- Make predictions for new students
- Create a visualization (`score_prediction_results.png`)

## Creating This Pipeline in the Visual Editor

### Step 1: Add Nodes

1. **DataLoader Node**
   - Upload or select a CSV file with student scores
   - Required columns: `midterm_score`, `final_score`

2. **DataSplit Node**
   - Set target column: `final_score`
   - Set train/test ratio: 0.8 (80% training, 20% testing)

3. **Regressor Node**
   - Algorithm: LinearRegression
   - This will train a model to predict final scores

4. **Evaluate Node**
   - Automatically uses regression metrics for regressor models
   - Displays: R², MAE, MSE, RMSE

5. **Predict Node**
   - Makes predictions on test data
   - Includes examples for interactive predictions

### Step 2: Connect Nodes

```
DataLoader → DataSplit → Regressor → Evaluate
                          ↓
                       Predict
```

Connections:
- DataLoader.data → DataSplit.data
- DataSplit.X_train → Regressor.X_train
- DataSplit.y_train → Regressor.y_train
- Regressor.model → Evaluate.model
- DataSplit.X_test → Evaluate.X_test
- DataSplit.y_test → Evaluate.y_test
- Regressor.model → Predict.model
- DataSplit.X_test → Predict.X_test

### Step 3: Generate Code

Click "Generate Code" to produce Python code that:
- Loads your data
- Trains the model
- Evaluates with proper regression metrics
- Makes predictions
- Includes interactive prediction examples

## Understanding the Generated Code

### Regression Metrics

The generated code now automatically uses regression metrics when a Regressor node is detected:

```python
# Evaluate Regression Model
y_pred = model_model.predict(split_X_test)
eval_metrics = {
    'mae': mean_absolute_error(split_y_test, y_pred),
    'mse': mean_squared_error(split_y_test, y_pred),
    'rmse': np.sqrt(mean_squared_error(split_y_test, y_pred)),
    'r2': r2_score(split_y_test, y_pred)
}
print("="*60)
print("📊 Regression Model Evaluation Results")
print("="*60)
print(f"R² Score (Coefficient of Determination): {eval_metrics['r2']:.4f}")
print(f"  → Explains {eval_metrics['r2']*100:.2f}% of variance")
print(f"Mean Absolute Error (MAE): {eval_metrics['mae']:.4f}")
print(f"Mean Squared Error (MSE): {eval_metrics['mse']:.4f}")
print(f"Root Mean Squared Error (RMSE): {eval_metrics['rmse']:.4f}")
print("="*60)
```

**Metric Explanations:**
- **R² Score**: How well the model explains variance in the data (0-1, higher is better)
- **MAE (Mean Absolute Error)**: Average absolute difference between predictions and actual values
- **MSE (Mean Squared Error)**: Average squared difference (penalizes large errors more)
- **RMSE (Root Mean Squared Error)**: Square root of MSE, in the same units as the target

### Interactive Predictions

The Predict node now includes helpful examples:

```python
# Interactive Prediction Example
# You can use the trained model to make predictions on new data:
# Example:
#   new_data = [[value1, value2, ...]]  # Replace with actual feature values
#   prediction = model_model.predict(new_data)
#   print(f"Prediction: {prediction[0]}")
#
# For single-feature models (e.g., score prediction):
#   input_value = 75  # Example: midterm score
#   prediction = model_model.predict([[input_value]])
#   print(f"Predicted output: {prediction[0]:.2f}")
```

## Example Data Format

Your CSV file should look like this:

```csv
midterm_score,final_score
62.47,65.41
97.04,91.14
83.92,82.59
75.92,65.80
49.36,53.39
```

## Improvements Made

### 1. Automatic Task Detection
The code generator now detects whether you're using a Classifier or Regressor and uses appropriate metrics:
- **Classifier**: accuracy, classification_report, confusion_matrix
- **Regressor**: MAE, MSE, RMSE, R²

### 2. Better Error Messages
If you forget to connect required inputs, you'll see clear warnings:
```python
# WARNING: Missing required connections!
#   - X_train input not connected
#   - y_train input not connected
# Please connect training data to this regressor node
```

### 3. Educational Comments
Generated code includes helpful comments explaining:
- What each step does
- How to interpret the metrics
- How to make predictions with new data
- Examples for common use cases

## Tips for Score Prediction

1. **Data Quality**: Ensure your CSV has no missing values in the score columns
2. **Feature Selection**: For simple score prediction, midterm_score is the main feature
3. **Model Choice**: LinearRegression is good for linear relationships; try RandomForestRegressor for non-linear patterns
4. **Evaluation**: An R² > 0.7 generally indicates a good model for score prediction
5. **Predictions**: Use the interactive example code to predict scores for new students

## Troubleshooting

### "Column 'final_score' not found"
Make sure your CSV has a column named exactly `final_score`, or update the target column in the DataSplit node.

### "Model performance is poor"
- Check if there's actually a relationship between midterm and final scores
- Try adding more features (attendance, homework scores, etc.)
- Consider using a different algorithm (Ridge, RandomForestRegressor)

### "Missing connections warning"
Verify all required connections:
- DataSplit needs data from DataLoader
- Regressor needs X_train and y_train from DataSplit
- Evaluate needs model, X_test, and y_test
- Predict needs model and X_test

## Next Steps

- Try the example: `python3 class_score_predict_example.py`
- Create your own score dataset
- Build the pipeline in the visual editor
- Generate and run the code
- Analyze the results and visualizations

## Related Examples

- `demo_real_world_example.py` - Customer churn prediction with multiple features
- `test_generated_code.py` - Iris classification example
- `test_regression_code_generation.py` - Verification of regression code structure
