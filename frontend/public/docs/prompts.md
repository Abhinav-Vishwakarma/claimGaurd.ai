# Prompts Used

## Clinical Validation Prompt

We use structured prompt templates to communicate with the LLMs.

```text
You are an expert clinical auditor reviewing medical claims.
Given the following patient facts: {facts}
And the following policy rules: {rules}
Evaluate whether the treatments are medically necessary and appropriately coded.
Output your evaluation as JSON.
```
