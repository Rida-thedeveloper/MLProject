"""
Compare Original vs New Balanced dataset using 5-Fold Stratified CV.
Does NOT modify any production files.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

# Load both datasets
original = pd.read_csv(r'C:\Users\MMC\.gemini\antigravity\scratch\Mockly\dataset\mockly_training.csv')
new_bal  = pd.read_csv(r'C:\Users\MMC\.gemini\antigravity\scratch\Mockly\dataset\mockly_training_balanced_new.csv')

features = ['wpm','pause_count','speech_duration','word_count']

def run_cv(df, name):
    X = df[features].values
    y = df['hesitation_label'].values
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    accs, macro_f1s, weighted_f1s = [], [], []
    low_recalls, med_recalls, high_recalls = [], [], []
    low_precs, med_precs, high_precs = [], [], []
    low_f1s, med_f1s, high_f1s = [], [], []
    all_cm = np.zeros((3,3), dtype=int)
    
    for fold, (train_idx, test_idx) in enumerate(skf.split(X, y), 1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        
        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        
        accs.append(accuracy_score(y_test, y_pred))
        macro_f1s.append(f1_score(y_test, y_pred, average='macro', zero_division=0))
        weighted_f1s.append(f1_score(y_test, y_pred, average='weighted', zero_division=0))
        
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        low_recalls.append(report.get('Low',{}).get('recall',0))
        med_recalls.append(report.get('Medium',{}).get('recall',0))
        high_recalls.append(report.get('High',{}).get('recall',0))
        low_precs.append(report.get('Low',{}).get('precision',0))
        med_precs.append(report.get('Medium',{}).get('precision',0))
        high_precs.append(report.get('High',{}).get('precision',0))
        low_f1s.append(report.get('Low',{}).get('f1-score',0))
        med_f1s.append(report.get('Medium',{}).get('f1-score',0))
        high_f1s.append(report.get('High',{}).get('f1-score',0))
        
        labels = sorted(list(set(y)))
        cm = confusion_matrix(y_test, y_pred, labels=labels)
        all_cm += cm

    print(f'\n{"="*60}')
    print(f'  {name}')
    print(f'  Rows: {len(df)} | Features: {features}')
    print(f'{"="*60}')
    print(f'  Accuracy:     {np.mean(accs)*100:.1f}% +/- {np.std(accs)*100:.1f}%')
    print(f'  Macro F1:     {np.mean(macro_f1s):.4f} +/- {np.std(macro_f1s):.4f}')
    print(f'  Weighted F1:  {np.mean(weighted_f1s):.4f} +/- {np.std(weighted_f1s):.4f}')
    print()
    print(f'  Per-class RECALL (avg over 5 folds):')
    print(f'    Low:    {np.mean(low_recalls)*100:.1f}% +/- {np.std(low_recalls)*100:.1f}%')
    print(f'    Medium: {np.mean(med_recalls)*100:.1f}% +/- {np.std(med_recalls)*100:.1f}%')
    print(f'    High:   {np.mean(high_recalls)*100:.1f}% +/- {np.std(high_recalls)*100:.1f}%')
    print()
    print(f'  Per-class PRECISION (avg over 5 folds):')
    print(f'    Low:    {np.mean(low_precs)*100:.1f}%')
    print(f'    Medium: {np.mean(med_precs)*100:.1f}%')
    print(f'    High:   {np.mean(high_precs)*100:.1f}%')
    print()
    print(f'  Per-class F1 (avg over 5 folds):')
    print(f'    Low:    {np.mean(low_f1s):.4f}')
    print(f'    Medium: {np.mean(med_f1s):.4f}')
    print(f'    High:   {np.mean(high_f1s):.4f}')
    print()
    labels = sorted(list(set(df['hesitation_label'])))
    print(f'  Confusion Matrix (summed across all folds):')
    header = '  '.join(f'{l:>7}' for l in labels)
    print(f'  Predicted ->  {header}')
    for i, l in enumerate(labels):
        row = '  '.join(f'{all_cm[i,j]:>7}' for j in range(len(labels)))
        print(f'  Actual {l:>6}: {row}')

print('Running 5-Fold Stratified CV on BOTH datasets...')
print('(This compares your ORIGINAL vs NEW BALANCED)')

run_cv(original, 'ORIGINAL: mockly_training.csv (5000 rows)')
run_cv(new_bal,  'NEW BALANCED: mockly_training_balanced_new.csv (7290 rows)')

# Feature separability check
print()
print('='*60)
print('  EXTRA: Feature Separability Check')
print('='*60)
for f in features:
    lo = new_bal[new_bal['hesitation_label']=='Low'][f].mean()
    me = new_bal[new_bal['hesitation_label']=='Medium'][f].mean()
    hi = new_bal[new_bal['hesitation_label']=='High'][f].mean()
    spread = max(lo,me,hi) - min(lo,me,hi)
    overall_std = new_bal[f].std()
    ratio = spread/overall_std if overall_std > 0 else 0
    print(f'  {f}: Low={lo:.1f}  Med={me:.1f}  High={hi:.1f}  | spread={spread:.1f}  std={overall_std:.1f}  ratio={ratio:.3f}')
