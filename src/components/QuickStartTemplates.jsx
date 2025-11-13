import React from 'react';

/**
 * 초보자를 위한 빠른 시작 템플릿 컴포넌트
 */
const QuickStartTemplates = ({ onApplyTemplate, theme = 'dark' }) => {
    // 테마에 따른 색상 정의
    const colors = {
        dark: {
            bg: 'bg-neutral-900/60',
            border: 'border-neutral-800/70',
            buttonBg: 'bg-neutral-800/80',
            buttonBorder: 'border-neutral-700',
            buttonHover: 'hover:bg-neutral-700 hover:border-cyan-500/50',
            title: 'text-cyan-400',
            text: 'text-gray-200',
            muted: 'text-gray-400',
            tipBg: 'bg-cyan-900/20',
            tipBorder: 'border-cyan-700/30',
            tipText: 'text-cyan-300'
        },
        light: {
            bg: 'bg-white/80',
            border: 'border-gray-300',
            buttonBg: 'bg-gray-100',
            buttonBorder: 'border-gray-300',
            buttonHover: 'hover:bg-gray-200 hover:border-cyan-600',
            title: 'text-cyan-600',
            text: 'text-gray-800',
            muted: 'text-gray-600',
            tipBg: 'bg-cyan-50',
            tipBorder: 'border-cyan-300',
            tipText: 'text-cyan-700'
        }
    };

    const c = colors[theme] || colors.dark;

    const templates = [
        {
            name: '🎯 기본 분류',
            description: '데이터 로드 → 분할 → 정규화 → 분류 → 평가',
            nodes: [
                { 
                    id: 'node-1', 
                    kind: 'dataLoader', 
                    label: 'Data Loader (데이터 로더)', 
                    position: { x: 50, y: 100 },
                    controls: { fileName: 'data.csv' }
                },
                { 
                    id: 'node-2', 
                    kind: 'dataSplit', 
                    label: 'Data Split (데이터 분할)', 
                    position: { x: 300, y: 100 },
                    controls: { ratio: 0.8, targetColumn: 'target' }
                },
                { 
                    id: 'node-3', 
                    kind: 'scaler', 
                    label: 'Scaler (정규화)', 
                    position: { x: 550, y: 50 },
                    controls: { method: 'StandardScaler' }
                },
                { 
                    id: 'node-4', 
                    kind: 'classifier', 
                    label: 'Classifier (분류기)', 
                    position: { x: 800, y: 100 },
                    controls: { algorithm: 'RandomForest', n_estimators: 100 }
                },
                { 
                    id: 'node-5', 
                    kind: 'evaluate', 
                    label: 'Evaluate (평가)', 
                    position: { x: 1050, y: 100 },
                    controls: {}
                }
            ],
            connections: [
                { source: 'node-1', sourceOutput: 'data', target: 'node-2', targetInput: 'data' },
                { source: 'node-2', sourceOutput: 'X_train', target: 'node-3', targetInput: 'X_train' },
                { source: 'node-3', sourceOutput: 'X_train', target: 'node-4', targetInput: 'X_train' },
                { source: 'node-2', sourceOutput: 'y_train', target: 'node-4', targetInput: 'y_train' },
                { source: 'node-4', sourceOutput: 'model', target: 'node-5', targetInput: 'model' },
                { source: 'node-2', sourceOutput: 'X_test', target: 'node-5', targetInput: 'X_test' },
                { source: 'node-2', sourceOutput: 'y_test', target: 'node-5', targetInput: 'y_test' }
            ]
        },
        {
            name: '📊 피처 선택 포함',
            description: '데이터 → 분할 → 정규화 → 피처선택 → 분류 → 평가',
            nodes: [
                { 
                    id: 'node-1', 
                    kind: 'dataLoader', 
                    label: 'Data Loader (데이터 로더)', 
                    position: { x: 50, y: 100 },
                    controls: { fileName: 'data.csv' }
                },
                { 
                    id: 'node-2', 
                    kind: 'dataSplit', 
                    label: 'Data Split (데이터 분할)', 
                    position: { x: 280, y: 100 },
                    controls: { ratio: 0.8, targetColumn: 'target' }
                },
                { 
                    id: 'node-3', 
                    kind: 'scaler', 
                    label: 'Scaler (정규화)', 
                    position: { x: 510, y: 50 },
                    controls: { method: 'StandardScaler' }
                },
                { 
                    id: 'node-4', 
                    kind: 'featureSelection', 
                    label: 'Feature Selection (피처 선택)', 
                    position: { x: 740, y: 100 },
                    controls: { method: 'SelectKBest', k: 10 }
                },
                { 
                    id: 'node-5', 
                    kind: 'classifier', 
                    label: 'Classifier (분류기)', 
                    position: { x: 970, y: 100 },
                    controls: { algorithm: 'RandomForest', n_estimators: 100 }
                },
                { 
                    id: 'node-6', 
                    kind: 'evaluate', 
                    label: 'Evaluate (평가)', 
                    position: { x: 1200, y: 100 },
                    controls: {}
                }
            ],
            connections: [
                { source: 'node-1', sourceOutput: 'data', target: 'node-2', targetInput: 'data' },
                { source: 'node-2', sourceOutput: 'X_train', target: 'node-3', targetInput: 'X_train' },
                { source: 'node-3', sourceOutput: 'X_train', target: 'node-4', targetInput: 'X_train' },
                { source: 'node-2', sourceOutput: 'y_train', target: 'node-4', targetInput: 'y_train' },
                { source: 'node-4', sourceOutput: 'X_train', target: 'node-5', targetInput: 'X_train' },
                { source: 'node-2', sourceOutput: 'y_train', target: 'node-5', targetInput: 'y_train' },
                { source: 'node-5', sourceOutput: 'model', target: 'node-6', targetInput: 'model' },
                { source: 'node-2', sourceOutput: 'X_test', target: 'node-6', targetInput: 'X_test' },
                { source: 'node-2', sourceOutput: 'y_test', target: 'node-6', targetInput: 'y_test' }
            ]
        },
        {
            name: '⚙️ 하이퍼파라미터 튜닝',
            description: '데이터 → 분할 → 튜닝 → 평가',
            nodes: [
                { 
                    id: 'node-1', 
                    kind: 'dataLoader', 
                    label: 'Data Loader (데이터 로더)', 
                    position: { x: 50, y: 100 },
                    controls: { fileName: 'data.csv' }
                },
                { 
                    id: 'node-2', 
                    kind: 'dataSplit', 
                    label: 'Data Split (데이터 분할)', 
                    position: { x: 300, y: 100 },
                    controls: { ratio: 0.8, targetColumn: 'target' }
                },
                { 
                    id: 'node-3', 
                    kind: 'hyperparamTune', 
                    label: 'Hyperparameter Tuning (하이퍼파라미터 튜닝)', 
                    position: { x: 550, y: 100 },
                    controls: {}
                },
                { 
                    id: 'node-4', 
                    kind: 'evaluate', 
                    label: 'Evaluate (평가)', 
                    position: { x: 850, y: 100 },
                    controls: {}
                }
            ],
            connections: [
                { source: 'node-1', sourceOutput: 'data', target: 'node-2', targetInput: 'data' },
                { source: 'node-2', sourceOutput: 'X_train', target: 'node-3', targetInput: 'X_train' },
                { source: 'node-2', sourceOutput: 'y_train', target: 'node-3', targetInput: 'y_train' },
                { source: 'node-3', sourceOutput: 'model', target: 'node-4', targetInput: 'model' },
                { source: 'node-2', sourceOutput: 'X_test', target: 'node-4', targetInput: 'X_test' },
                { source: 'node-2', sourceOutput: 'y_test', target: 'node-4', targetInput: 'y_test' }
            ]
        },
        {
            name: '🔮 예측 워크플로우',
            description: '데이터 → 분할 → 분류 → 예측 → 평가',
            nodes: [
                { 
                    id: 'node-1', 
                    kind: 'dataLoader', 
                    label: 'Data Loader (데이터 로더)', 
                    position: { x: 50, y: 100 },
                    controls: { fileName: 'data.csv' }
                },
                { 
                    id: 'node-2', 
                    kind: 'dataSplit', 
                    label: 'Data Split (데이터 분할)', 
                    position: { x: 300, y: 100 },
                    controls: { ratio: 0.8, targetColumn: 'target' }
                },
                { 
                    id: 'node-3', 
                    kind: 'classifier', 
                    label: 'Classifier (분류기)', 
                    position: { x: 550, y: 50 },
                    controls: { algorithm: 'RandomForest', n_estimators: 100 }
                },
                { 
                    id: 'node-4', 
                    kind: 'predict', 
                    label: 'Predict (예측)', 
                    position: { x: 800, y: 100 },
                    controls: {}
                },
                { 
                    id: 'node-5', 
                    kind: 'evaluate', 
                    label: 'Evaluate (평가)', 
                    position: { x: 1050, y: 100 },
                    controls: {}
                }
            ],
            connections: [
                { source: 'node-1', sourceOutput: 'data', target: 'node-2', targetInput: 'data' },
                { source: 'node-2', sourceOutput: 'X_train', target: 'node-3', targetInput: 'X_train' },
                { source: 'node-2', sourceOutput: 'y_train', target: 'node-3', targetInput: 'y_train' },
                { source: 'node-3', sourceOutput: 'model', target: 'node-4', targetInput: 'model' },
                { source: 'node-2', sourceOutput: 'X_test', target: 'node-4', targetInput: 'X_test' },
                { source: 'node-4', sourceOutput: 'prediction', target: 'node-5', targetInput: 'prediction' },
                { source: 'node-2', sourceOutput: 'y_test', target: 'node-5', targetInput: 'y_test' }
            ]
        }
    ];

    return (
        <div className={`p-4 ${c.bg} rounded-2xl border ${c.border}`}>
            <div className="mb-3">
                <h3 className={`text-lg font-semibold ${c.title} flex items-center gap-2`}>
                    🚀 빠른 시작
                </h3>
                <p className={`text-xs ${c.muted} mt-1`}>
                    템플릿을 선택하여 기본 파이프라인을 자동으로 생성하세요
                </p>
            </div>
            
            <div className="flex flex-col gap-2">
                {templates.map((template, index) => (
                    <button
                        key={index}
                        onClick={() => onApplyTemplate(template)}
                        className={`p-3 text-left ${c.buttonBg} border ${c.buttonBorder} rounded-lg ${c.buttonHover} transition-all`}
                        title="클릭하여 이 템플릿 적용"
                    >
                        <div className={`font-semibold text-sm ${c.text}`}>
                            {template.name}
                        </div>
                        <div className={`text-xs ${c.muted} mt-1`}>
                            {template.description}
                        </div>
                    </button>
                ))}
            </div>

            <div className={`mt-4 p-3 ${c.tipBg} border ${c.tipBorder} rounded-lg`}>
                <div className={`text-xs ${c.tipText}`}>
                    💡 <strong>팁:</strong> 템플릿 적용 후 각 노드를 클릭하여 설정을 변경하세요!
                </div>
            </div>
        </div>
    );
};

export default QuickStartTemplates;
