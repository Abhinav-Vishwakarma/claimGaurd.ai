# The Knowledge Base

## Rules and Logic Schema

The system uses a declarative schema for rules, typically loaded from a database or JSON configuration. Each rule contains:
- `condition`: A logical expression evaluating facts.
- `action`: What to do if the condition is met (e.g., flag as risky).

## Vector Database

We use Qdrant for our vector database to store and search through unstructured clinical data, policies, and standard operating procedures (SOPs).
