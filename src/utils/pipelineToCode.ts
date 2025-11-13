/**
 * ML Pipeline 노드 그래프를 Python 코드로 변환
 */

export interface NodeData {
    id: string
    label: string
    kind: string
    controls?: Record<string, any>
    position: { x: number; y: number }
}

export interface ConnectionData {
    id: string
    source: string
    target: string
    sourceOutput: string
    targetInput: string
}

export interface GraphData {
    nodes: NodeData[]
    connections: ConnectionData[]
}

export class PipelineValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PipelineValidationError'
    }
}

/**
 * 파이프라인 사전 검증
 */
function validatePipelineStructure(nodes: NodeData[], connections: ConnectionData[]): void {
    // 1. DataLoader 노드 필수
    const hasDataLoader = nodes.some(n => n.kind === 'dataLoader')
    if (!hasDataLoader) {
        throw new PipelineValidationError('파이프라인에 DataLoader 노드가 필요합니다.')
    }

    // 2. 고립된 노드 검사
    const connectedNodes = new Set<string>()
    connections.forEach(conn => {
        connectedNodes.add(conn.source)
        connectedNodes.add(conn.target)
    })
    
    const orphanedNodes = nodes.filter(n => 
        n.kind !== 'dataLoader' && !connectedNodes.has(n.id)
    )
    
    if (orphanedNodes.length > 0) {
        const orphanLabels = orphanedNodes.map(n => n.label).join(', ')
        throw new PipelineValidationError(
            `연결되지 않은 노드가 있습니다: ${orphanLabels}`
        )
    }

    // 3. 필수 연결 검증 (예: DataSplit은 데이터 입력 필요)
    nodes.forEach(node => {
        const incoming = connections.filter(c => c.target === node.id)
        
        if (node.kind === 'dataSplit' && incoming.length === 0) {
            throw new PipelineValidationError(
                `${node.label}: DataSplit 노드는 데이터 입력이 필요합니다.`
            )
        }
        
        if (['classifier', 'regressor', 'neuralNet'].includes(node.kind)) {
            const hasXTrain = incoming.some(c => c.targetInput === 'X_train')
            const hasYTrain = incoming.some(c => c.targetInput === 'y_train')
            
            if (!hasXTrain || !hasYTrain) {
                throw new PipelineValidationError(
                    `${node.label}: 모델 노드는 X_train과 y_train이 모두 필요합니다.`
                )
            }
        }
    })
}

/**
 * 노드 그래프를 분석하여 실행 순서 결정 (Topological Sort)
 */
function topologicalSort(nodes: NodeData[], connections: ConnectionData[]): NodeData[] {
    const graph = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    
    // 그래프 초기화
    nodes.forEach(node => {
        graph.set(node.id, [])
        inDegree.set(node.id, 0)
    })
    
    // 연결 정보로 그래프 구성
    connections.forEach(conn => {
        graph.get(conn.source)?.push(conn.target)
        inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1)
    })
    
    // 진입 차수가 0인 노드들로 시작
    const queue: string[] = []
    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) queue.push(nodeId)
    })
    
    const sorted: NodeData[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    while (queue.length > 0) {
        const nodeId = queue.shift()!
        const node = nodeMap.get(nodeId)
        if (node) sorted.push(node)
        
        graph.get(nodeId)?.forEach(neighbor => {
            const degree = (inDegree.get(neighbor) || 0) - 1
            inDegree.set(neighbor, degree)
            if (degree === 0) queue.push(neighbor)
        })
    }
    
    return sorted
}

/**
 * 노드 종류에 따른 간단한 변수명 생성
 */
function getSimpleVarName(node: NodeData, nodeIndex: Map<string, number>): string {
    const kindMap: Record<string, string> = {
        'dataLoader': 'data',
        'dataSplit': 'split',
        'scaler': 'scaler',
        'featureSelection': 'feature',
        'classifier': 'model',
        'regressor': 'model',
        'neuralNet': 'nn',
        'evaluation': 'eval',
        'tuning': 'tuner'
    }
    
    const baseName = kindMap[node.kind] || 'step'
    const index = nodeIndex.get(node.kind) || 0
    nodeIndex.set(node.kind, index + 1)
    
    return index === 0 ? baseName : `${baseName}${index + 1}`
}

/**
 * 노드를 Python 코드로 변환
 */
function nodeToCode(
    node: NodeData, 
    connections: ConnectionData[], 
    nodeMap: Map<string, NodeData>, 
    varName: string,
    varNameMap?: Map<string, string>
): string {
    
    // Helper: 연결된 소스 노드의 변수명 가져오기
    const getSourceVarName = (targetNodeId: string, inputKey: string): string => {
        const conn = connections.find(c => c.target === targetNodeId && c.targetInput === inputKey)
        if (!conn) return 'data'
        return varNameMap?.get(conn.source) || `step_${conn.source.replace(/[^a-zA-Z0-9]/g, '_')}`
    }
    
    // Helper: 연결된 소스 노드의 출력 변수명 가져오기
    const getSourceOutputVar = (targetNodeId: string, inputKey: string): string => {
        const conn = connections.find(c => c.target === targetNodeId && c.targetInput === inputKey)
        if (!conn) return 'data'
        const sourceVarName = varNameMap?.get(conn.source) || `step_${conn.source.replace(/[^a-zA-Z0-9]/g, '_')}`
        return `${sourceVarName}_${conn.sourceOutput}`
    }
    
    switch (node.kind) {
        case 'dataLoader': {
            // exportGraph는 이미 .value를 추출해서 controls에 저장함
            const fileName = node.controls?.fileName || 'data.csv'
            
            // localStorage에서 실제 CSV 데이터 확인
            const storedData = typeof window !== 'undefined' ? localStorage.getItem(`csv_data_${fileName}`) : null
            
            if (storedData) {
                // 실제 업로드된 CSV 데이터를 Base64로 인코딩하여 포함
                const base64Content = typeof btoa !== 'undefined' 
                    ? btoa(unescape(encodeURIComponent(storedData)))
                    : Buffer.from(storedData).toString('base64')
                
                return `# Load Data from uploaded CSV: ${fileName}
import io
import base64

# Embedded CSV data (uploaded from browser)
csv_content = base64.b64decode('${base64Content}').decode('utf-8')
${varName} = pd.read_csv(io.StringIO(csv_content))
print(f"Data loaded from ${fileName}: {${varName}.shape}")
print("\\nFirst 5 rows:")
print(${varName}.head())`
            } else {
                // 파일 경로만 있는 경우 (기존 방식)
                return `# Load Data from file
${varName} = pd.read_csv('${fileName}')
print(f"Data loaded: {${varName}.shape}")
print("\\nFirst 5 rows:")
print(${varName}.head())`
            }
        }
        
        case 'dataSplit': {
            const ratio = node.controls?.ratio || 0.8
            const targetColumn = node.controls?.targetColumn || 'target'
            const sourceVar = getSourceVarName(node.id, 'data')
            
            return `# Train/Test Split
# Target column: '${targetColumn}'
X_all = ${sourceVar}.drop('${targetColumn}', axis=1)
y_all = ${sourceVar}['${targetColumn}']
${varName}_X_train, ${varName}_X_test, ${varName}_y_train, ${varName}_y_test = train_test_split(
    X_all, y_all, test_size=${(1 - ratio).toFixed(2)}, random_state=42
)
print(f"Train size: {{len(${varName}_X_train)}}, Test size: {{len(${varName}_X_test)}}")
print(f"Target column: '${targetColumn}'")`
        }
        
        case 'scaler': {
            const method = node.controls?.method || 'StandardScaler'
            
            const xTrainVar = getSourceOutputVar(node.id, 'X_train')
            const xTestConn = connections.find(c => c.target === node.id && c.targetInput === 'X_test')
            
            if (xTestConn) {
                const xTestVar = getSourceOutputVar(node.id, 'X_test')
                
                return `# Scale Features (Train and Test)
${varName} = ${method}()
${varName}_X_train = ${varName}.fit_transform(${xTrainVar})
${varName}_X_test = ${varName}.transform(${xTestVar})
print("Features scaled using ${method}")
print(f"Scaled train shape: {${varName}_X_train.shape}")
print(f"Scaled test shape: {${varName}_X_test.shape}")`
            } else {
                // X_test가 없는 경우 (X_train만)
                return `# Scale Features (Train only)
${varName} = ${method}()
${varName}_X_train = ${varName}.fit_transform(${xTrainVar})
print("Features scaled using ${method}")
print(f"Scaled train shape: {${varName}_X_train.shape}")
# Note: X_test not connected - only training data scaled`
            }
        }
        
        case 'featureSelection': {
            const method = node.controls?.method || 'SelectKBest'
            const k = node.controls?.k || 10
            
            // 입력 연결 찾기 (X_train과 y_train)
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this feature selection node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            return `# Feature Selection
${varName} = ${method}(k=${k})
step_${nodeId}_X_train = ${varName}.fit_transform(${xTrainVar}, ${yTrainVar})
print(f"Selected {k} best features from {${xTrainVar}.shape[1]} features")`
        }
        
        case 'classifier': {
            const algorithm = node.controls?.algorithm || 'RandomForest'
            const nEstimators = node.controls?.n_estimators || 100
            
            // 입력 연결 찾기 (X_train과 y_train)
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this classifier node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            let modelCode = ''
            if (algorithm === 'RandomForest') {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            } else if (algorithm === 'LogisticRegression') {
                modelCode = `LogisticRegression(random_state=42, max_iter=1000)`
            } else if (algorithm === 'SVM') {
                modelCode = `SVC(random_state=42)`
            } else if (algorithm === 'DecisionTree') {
                modelCode = `DecisionTreeClassifier(random_state=42)`
            } else if (algorithm === 'KNN') {
                modelCode = `KNeighborsClassifier(n_neighbors=5)`
            } else if (algorithm === 'GradientBoosting') {
                modelCode = `GradientBoostingClassifier(n_estimators=${nEstimators}, random_state=42)`
            } else {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            }
            
            return `# Train Classifier
step_${nodeId}_model = ${modelCode}
step_${nodeId}_model.fit(${xTrainVar}, ${yTrainVar})
print("Model trained: ${algorithm}")
print(f"Training score: {step_${nodeId}_model.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'regressor': {
            const algorithm = node.controls?.algorithm || 'LinearRegression'
            
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this regressor node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            let modelCode = ''
            if (algorithm === 'LinearRegression') {
                modelCode = `LinearRegression()`
            } else if (algorithm === 'Ridge') {
                modelCode = `Ridge(random_state=42)`
            } else if (algorithm === 'Lasso') {
                modelCode = `Lasso(random_state=42)`
            } else if (algorithm === 'RandomForestRegressor') {
                modelCode = `RandomForestRegressor(random_state=42)`
            } else if (algorithm === 'SVR') {
                modelCode = `SVR()`
            } else if (algorithm === 'GradientBoostingRegressor') {
                modelCode = `GradientBoostingRegressor(random_state=42)`
            } else {
                modelCode = `LinearRegression()`
            }
            
            return `# Train Regressor
step_${nodeId}_model = ${modelCode}
step_${nodeId}_model.fit(${xTrainVar}, ${yTrainVar})
print("Model trained: ${algorithm}")
print(f"Training R² score: {step_${nodeId}_model.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'neuralNet': {
            const layers = node.controls?.layers || '64,32'
            const epochs = node.controls?.epochs || 50
            
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this neural network node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            return `# Train Neural Network
step_${nodeId}_model = MLPClassifier(hidden_layer_sizes=(${layers}), max_iter=${epochs}, random_state=42)
step_${nodeId}_model.fit(${xTrainVar}, ${yTrainVar})
print("Neural Network trained with layers: [${layers}]")
print(f"Training score: {step_${nodeId}_model.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'evaluate': {
            // 입력 연결 찾기
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const xTestConn = connections.find(c => c.target === node.id && c.targetInput === 'X_test')
            const yTestConn = connections.find(c => c.target === node.id && c.targetInput === 'y_test')
            const predictionConn = connections.find(c => c.target === node.id && c.targetInput === 'prediction')
            
            // 두 가지 평가 모드 지원:
            // 1. prediction-based: prediction + y_test만 있으면 됨
            // 2. model-based: model + X_test + y_test가 필요
            
            const hasPrediction = !!predictionConn
            const hasModel = !!modelConn && !!xTestConn
            
            if (!hasPrediction && !hasModel) {
                return `# WARNING: Evaluate node needs either:
#   Option 1: prediction input + y_test input
#   Option 2: model input + X_test input + y_test input
# Please connect the required inputs`
            }
            
            if (!yTestConn) {
                return `# WARNING: y_test input is required for evaluation
# Please connect y_test data to this evaluate node`
            }
            
            const yTestSourceId = yTestConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTestVar = `step_${yTestSourceId}_${yTestConn.sourceOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            // Determine if this is a regression or classification task
            // Check the model source node kind
            let isRegression = false
            if (modelConn) {
                const modelSourceNode = nodeMap.get(modelConn.source)
                if (modelSourceNode && modelSourceNode.kind === 'regressor') {
                    isRegression = true
                }
            }
            
            let evaluationCode = ''
            
            if (hasPrediction) {
                // prediction이 이미 있는 경우
                const predSourceId = predictionConn!.source.replace(/[^a-zA-Z0-9]/g, '_')
                const predVar = `step_${predSourceId}_${predictionConn!.sourceOutput}`
                
                if (isRegression) {
                    evaluationCode = `# Evaluate Regression Model (using pre-computed predictions)
step_${nodeId}_metrics = {
    'mae': mean_absolute_error(${yTestVar}, ${predVar}),
    'mse': mean_squared_error(${yTestVar}, ${predVar}),
    'rmse': np.sqrt(mean_squared_error(${yTestVar}, ${predVar})),
    'r2': r2_score(${yTestVar}, ${predVar})
}
print("="*60)
print("📊 Regression Model Evaluation Results")
print("="*60)
print(f"R² Score (Coefficient of Determination): {step_${nodeId}_metrics['r2']:.4f}")
print(f"  → Explains {step_${nodeId}_metrics['r2']*100:.2f}% of variance")
print(f"Mean Absolute Error (MAE): {step_${nodeId}_metrics['mae']:.4f}")
print(f"Mean Squared Error (MSE): {step_${nodeId}_metrics['mse']:.4f}")
print(f"Root Mean Squared Error (RMSE): {step_${nodeId}_metrics['rmse']:.4f}")
print("="*60)`
                } else {
                    evaluationCode = `# Evaluate Classification Model (using pre-computed predictions)
step_${nodeId}_metrics = {
    'accuracy': accuracy_score(${yTestVar}, ${predVar})
}
print(f"Accuracy: {step_${nodeId}_metrics['accuracy']:.4f}")
print("\\nClassification Report:")
print(classification_report(${yTestVar}, ${predVar}))
print("\\nConfusion Matrix:")
print(confusion_matrix(${yTestVar}, ${predVar}))`
                }
            } else {
                // model로부터 예측 생성
                const modelSourceId = modelConn!.source.replace(/[^a-zA-Z0-9]/g, '_')
                const xTestSourceId = xTestConn!.source.replace(/[^a-zA-Z0-9]/g, '_')
                
                const modelVar = `step_${modelSourceId}_model`
                const xTestVar = `step_${xTestSourceId}_${xTestConn!.sourceOutput}`
                
                if (isRegression) {
                    evaluationCode = `# Evaluate Regression Model
y_pred = ${modelVar}.predict(${xTestVar})
step_${nodeId}_metrics = {
    'mae': mean_absolute_error(${yTestVar}, y_pred),
    'mse': mean_squared_error(${yTestVar}, y_pred),
    'rmse': np.sqrt(mean_squared_error(${yTestVar}, y_pred)),
    'r2': r2_score(${yTestVar}, y_pred)
}
print("="*60)
print("📊 Regression Model Evaluation Results")
print("="*60)
print(f"R² Score (Coefficient of Determination): {step_${nodeId}_metrics['r2']:.4f}")
print(f"  → Explains {step_${nodeId}_metrics['r2']*100:.2f}% of variance")
print(f"Mean Absolute Error (MAE): {step_${nodeId}_metrics['mae']:.4f}")
print(f"Mean Squared Error (MSE): {step_${nodeId}_metrics['mse']:.4f}")
print(f"Root Mean Squared Error (RMSE): {step_${nodeId}_metrics['rmse']:.4f}")
print("="*60)`
                } else {
                    evaluationCode = `# Evaluate Classification Model
y_pred = ${modelVar}.predict(${xTestVar})
step_${nodeId}_metrics = {
    'accuracy': accuracy_score(${yTestVar}, y_pred)
}
print(f"Accuracy: {step_${nodeId}_metrics['accuracy']:.4f}")
print("\\nClassification Report:")
print(classification_report(${yTestVar}, y_pred))
print("\\nConfusion Matrix:")
print(confusion_matrix(${yTestVar}, y_pred))`
                }
            }
            
            return evaluationCode
        }
        
        case 'predict': {
            // 입력 연결 찾기
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const xTestConn = connections.find(c => c.target === node.id && c.targetInput === 'X_test')
            
            // 연결이 없으면 경고
            if (!modelConn || !xTestConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!modelConn) warnings += '#   - model input not connected\n'
                if (!xTestConn) warnings += '#   - X_test input not connected\n'
                return warnings + '# Please connect model and X_test data to this predict node'
            }
            
            const modelSourceId = modelConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTestSourceId = xTestConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            
            const modelVar = `step_${modelSourceId}_model`
            const xTestVar = `step_${xTestSourceId}_${xTestConn.sourceOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            const predictCode = `# Make Predictions
step_${nodeId}_prediction = ${modelVar}.predict(${xTestVar})
print(f"Predictions made: {len(step_${nodeId}_prediction)} samples")
print(f"First 10 predictions: {step_${nodeId}_prediction[:10]}")

# ========================================
# Interactive Prediction Example
# ========================================
# You can use the trained model to make predictions on new data:
# Example:
#   new_data = [[value1, value2, ...]]  # Replace with actual feature values
#   prediction = ${modelVar}.predict(new_data)
#   print(f"Prediction: {prediction[0]}")
#
# For single-feature models (e.g., score prediction):
#   input_value = 75  # Example: midterm score
#   prediction = ${modelVar}.predict([[input_value]])
#   print(f"Predicted output: {prediction[0]:.2f}")`
            
            return predictCode
        }
        
        case 'hyperparamTune': {
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this hyperparameter tuning node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            return `# Hyperparameter Tuning
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, 30]
}
grid_search = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5)
grid_search.fit(${xTrainVar}, ${yTrainVar})
step_${nodeId}_model = grid_search.best_estimator_
print(f"Best parameters: {grid_search.best_params_}")
print(f"Best score: {grid_search.best_score_:.4f}")`
        }
        
        default:
            return `# Unknown node type: ${node.kind}`
    }
}

/**
 * 필요한 import 문 생성
 */
function generateImports(nodes: NodeData[]): string {
    const imports = new Set<string>()
    
    imports.add('import pandas as pd')
    imports.add('import numpy as np')
    
    // dataLoader에서 CSV embedding 사용 시 필요
    const hasDataLoader = nodes.some(n => n.kind === 'dataLoader')
    if (hasDataLoader) {
        imports.add('import io')
        imports.add('import base64')
    }
    
    nodes.forEach(node => {
        switch (node.kind) {
            case 'dataSplit':
                imports.add('from sklearn.model_selection import train_test_split')
                break
            case 'scaler':
                imports.add('from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler')
                break
            case 'featureSelection':
                imports.add('from sklearn.feature_selection import SelectKBest, f_classif')
                break
            case 'classifier':
                imports.add('from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier')
                imports.add('from sklearn.linear_model import LogisticRegression')
                imports.add('from sklearn.svm import SVC')
                imports.add('from sklearn.tree import DecisionTreeClassifier')
                imports.add('from sklearn.neighbors import KNeighborsClassifier')
                break
            case 'regressor':
                imports.add('from sklearn.linear_model import LinearRegression, Ridge, Lasso')
                imports.add('from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor')
                imports.add('from sklearn.svm import SVR')
                break
            case 'neuralNet':
                imports.add('from sklearn.neural_network import MLPClassifier')
                break
            case 'evaluate':
                imports.add('from sklearn.metrics import accuracy_score, classification_report, confusion_matrix')
                imports.add('from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score')
                break
            case 'hyperparamTune':
                imports.add('from sklearn.model_selection import GridSearchCV')
                break
        }
    })
    
    return Array.from(imports).join('\n')
}

/**
 * 전체 파이프라인을 Python 코드로 변환
 */
export function generatePythonCode(graph: GraphData): string {
    if (!graph.nodes || graph.nodes.length === 0) {
        throw new PipelineValidationError('파이프라인에 노드가 없습니다.')
    }
    
    // ML 노드만 필터링
    const mlNodes = graph.nodes.filter(n => 
        ['dataLoader', 'dataSplit', 'scaler', 'featureSelection', 
         'classifier', 'regressor', 'neuralNet', 'evaluate', 
         'predict', 'hyperparamTune'].includes(n.kind)
    )
    
    if (mlNodes.length === 0) {
        throw new PipelineValidationError('파이프라인에 ML 노드가 없습니다.')
    }
    
    // ✅ 파이프라인 구조 검증
    validatePipelineStructure(mlNodes, graph.connections)
    
    // 노드 실행 순서 결정
    const sortedNodes = topologicalSort(mlNodes, graph.connections)
    const nodeMap = new Map(mlNodes.map(n => [n.id, n]))
    
    // 변수명 맵 생성 (간단한 이름 부여)
    const varNameMap = new Map<string, string>()
    const nodeIndex = new Map<string, number>()
    
    sortedNodes.forEach(node => {
        const varName = getSimpleVarName(node, nodeIndex)
        varNameMap.set(node.id, varName)
    })
    
    // Import 문 생성
    const imports = generateImports(mlNodes)
    
    // 각 노드를 코드로 변환
    const codeBlocks = sortedNodes.map(node => {
        const varName = varNameMap.get(node.id) || 'data'
        return nodeToCode(node, graph.connections, nodeMap, varName, varNameMap)
    })
    
    // 전체 코드 조립
    return `${imports}

# ========================================
# ML Pipeline Auto-Generated Code
# ========================================

${codeBlocks.join('\n\n')}

# ========================================
# Pipeline Complete!
# ========================================
`
}

/**
 * Jupyter Notebook JSON 생성
 */
export function generateJupyterNotebook(graph: GraphData, pipelineName: string = 'ML Pipeline'): string {
    const pythonCode = generatePythonCode(graph)
    
    // 코드를 논리적 섹션으로 분할
    const sections = pythonCode.split('\n\n')
    
    const cells = [
        {
            cell_type: 'markdown',
            metadata: {},
            source: [
                `# ${pipelineName}\n`,
                '\n',
                'This notebook was auto-generated from a visual ML pipeline builder.\n',
                '\n',
                `Generated on: ${new Date().toLocaleString('ko-KR')}\n`
            ]
        },
        ...sections.map(section => ({
            cell_type: 'code',
            execution_count: null,
            metadata: {},
            outputs: [],
            source: section.split('\n').map(line => line + '\n')
        }))
    ]
    
    const notebook = {
        cells,
        metadata: {
            kernelspec: {
                display_name: 'Python 3',
                language: 'python',
                name: 'python3'
            },
            language_info: {
                name: 'python',
                version: '3.8.0'
            }
        },
        nbformat: 4,
        nbformat_minor: 4
    }
    
    return JSON.stringify(notebook, null, 2)
}

/**
 * Python 스크립트 파일 생성 (.py)
 */
export function generatePythonScript(graph: GraphData, pipelineName: string = 'ML Pipeline'): string {
    const pythonCode = generatePythonCode(graph)
    
    const header = `"""
${pipelineName}

Auto-generated ML Pipeline Script
Generated on: ${new Date().toLocaleString('ko-KR')}

This script was created from a visual ML pipeline builder.
"""

`
    
    return header + pythonCode
}
