"""
Coach Brain Agent - Trainer Methodology Learning System

This agent implements RAG (Retrieval Augmented Generation) to personalize
AI coaching responses using each trainer's unique methodology and voice.

Features:
- Vector similarity search for relevant training examples
- Dynamic prompt engineering with trainer-specific context
- Response logging for trainer review and approval
- Continuous learning from trainer feedback
"""

import os
from typing import Any, TypedDict
from uuid import UUID

from anthropic import Anthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from openai import AsyncOpenAI
from supabase import create_client, Client

# Initialize clients
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for backend
)


class CoachBrainState(TypedDict):
    """State for Coach Brain agent workflow"""
    trainer_id: str
    client_id: str | None
    query: str
    methodology: dict | None
    context: list[dict]
    response: str | None
    error: str | None


class CoachBrainPrompt:
    """Prompt engineering for trainer-specific AI responses"""

    def __init__(self, methodology: dict, context: list[dict]):
        self.methodology = methodology
        self.context = context

    def build_system_prompt(self) -> str:
        """Build system prompt with trainer methodology and relevant examples"""

        # Extract methodology fields
        philosophy = self.methodology.get('training_philosophy', '')
        nutrition = self.methodology.get('nutrition_approach', '')
        style = self.methodology.get('communication_style', '')
        key_phrases = self.methodology.get('key_phrases', [])
        avoid_phrases = self.methodology.get('avoid_phrases', [])

        # Format context examples
        context_str = self._format_context()

        prompt = f"""You are an AI fitness coach representing a specific personal trainer. Your goal is to respond to client questions in this trainer's unique voice, following their exact methodology and communication style.

## TRAINER METHODOLOGY

### Training Philosophy
{philosophy if philosophy else 'No specific training philosophy provided.'}

### Nutrition Approach
{nutrition if nutrition else 'No specific nutrition approach provided.'}

### Communication Style
{style if style else 'No specific communication style provided.'}

### Key Phrases This Trainer Uses
{self._format_phrases(key_phrases) if key_phrases else 'No key phrases specified.'}

### Phrases to NEVER Use
{self._format_phrases(avoid_phrases) if avoid_phrases else 'No avoid phrases specified.'}

## RELEVANT EXAMPLES FROM THIS TRAINER'S HISTORY

{context_str if context_str else 'No historical examples available yet.'}

## INSTRUCTIONS

1. **Match the Voice:** Respond exactly as this trainer would. Use their phrases, tone, and style.

2. **Stay Consistent:** Reference their philosophy when giving advice. Stay aligned with their training and nutrition approach.

3. **Be Natural:** Work in their key phrases naturally - don't force them. Avoid their prohibited phrases at all costs.

4. **Acknowledge Limitations:** If you're uncertain or the question requires trainer-specific knowledge you don't have, acknowledge it and suggest the client ask their trainer directly.

5. **Be Supportive:** Always maintain a supportive, encouraging tone consistent with the trainer's style.

6. **Stay Practical:** Give actionable advice that aligns with this trainer's methodology.

7. **Context Matters:** Use the historical examples above to understand how this trainer communicates and what advice they typically give.

Remember: You are this specific trainer's AI assistant. Clients should feel like they're getting advice from their trainer, not a generic chatbot.
"""
        return prompt

    def _format_context(self) -> str:
        """Format retrieved context examples"""
        if not self.context:
            return ""

        formatted = []
        for i, item in enumerate(self.context, 1):
            content_type = item.get('input_type', 'unknown')
            content = item.get('content', '')
            similarity = item.get('similarity', 0)

            formatted.append(
                f"Example {i} ({content_type}, relevance: {similarity:.1%}):\n{content}"
            )

        return "\n\n".join(formatted)

    def _format_phrases(self, phrases: list[str]) -> str:
        """Format phrase list"""
        if not phrases:
            return "None specified"
        return "\n".join([f"- {phrase}" for phrase in phrases])


class CoachBrainAgent:
    """LangGraph agent for Coach Brain RAG pipeline"""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow"""
        workflow = StateGraph(CoachBrainState)

        # Add nodes
        workflow.add_node("retrieve_methodology", self.retrieve_methodology)
        workflow.add_node("retrieve_context", self.retrieve_context)
        workflow.add_node("generate_response", self.generate_response)
        workflow.add_node("log_response", self.log_response)

        # Define edges
        workflow.set_entry_point("retrieve_methodology")
        workflow.add_edge("retrieve_methodology", "retrieve_context")
        workflow.add_edge("retrieve_context", "generate_response")
        workflow.add_edge("generate_response", "log_response")
        workflow.add_edge("log_response", END)

        return workflow.compile()

    async def retrieve_methodology(self, state: CoachBrainState) -> CoachBrainState:
        """Retrieve trainer's methodology from database"""
        try:
            response = supabase.table('trainer_methodology') \
                .select('*') \
                .eq('trainer_id', state['trainer_id']) \
                .eq('is_active', True) \
                .single() \
                .execute()

            if response.data:
                state['methodology'] = response.data
            else:
                # No methodology set - use generic coaching
                state['methodology'] = {
                    'training_philosophy': 'Evidence-based training principles',
                    'nutrition_approach': 'Balanced, sustainable nutrition',
                    'communication_style': 'Supportive and educational',
                    'key_phrases': [],
                    'avoid_phrases': []
                }

            return state

        except Exception as e:
            print(f"Error retrieving methodology: {e}")
            state['error'] = f"Failed to retrieve methodology: {str(e)}"
            return state

    async def retrieve_context(self, state: CoachBrainState) -> CoachBrainState:
        """Retrieve relevant training examples using RAG"""
        try:
            # Generate embedding for query
            query_embedding = await self._generate_embedding(state['query'])

            # Call PostgreSQL similarity search function
            response = supabase.rpc(
                'match_methodology_training_data',
                {
                    'query_trainer_id': state['trainer_id'],
                    'query_embedding': query_embedding,
                    'match_threshold': 0.7,
                    'match_count': 5
                }
            ).execute()

            state['context'] = response.data if response.data else []

            return state

        except Exception as e:
            print(f"Error retrieving context: {e}")
            # Continue without context if retrieval fails
            state['context'] = []
            return state

    async def generate_response(self, state: CoachBrainState) -> CoachBrainState:
        """Generate AI response using Claude with trainer-specific prompt"""
        try:
            # Build prompt with methodology and context
            prompt = CoachBrainPrompt(
                state['methodology'],
                state['context']
            )

            # Generate response using Claude
            message = anthropic.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                temperature=0.7,
                system=prompt.build_system_prompt(),
                messages=[{
                    "role": "user",
                    "content": state['query']
                }]
            )

            state['response'] = message.content[0].text

            return state

        except Exception as e:
            print(f"Error generating response: {e}")
            state['error'] = f"Failed to generate response: {str(e)}"
            state['response'] = "I apologize, but I'm having trouble generating a response right now. Please try again or contact your trainer directly."
            return state

    async def log_response(self, state: CoachBrainState) -> CoachBrainState:
        """Log response for trainer review"""
        try:
            # Prepare context for logging (remove embeddings, keep text)
            context_for_log = [
                {
                    'content': item.get('content', ''),
                    'input_type': item.get('input_type', ''),
                    'similarity': item.get('similarity', 0)
                }
                for item in state['context']
            ]

            # Insert log record
            supabase.table('methodology_response_logs').insert({
                'trainer_id': state['trainer_id'],
                'client_id': state.get('client_id'),
                'query': state['query'],
                'response': state['response'],
                'context_used': context_for_log
            }).execute()

            return state

        except Exception as e:
            print(f"Error logging response: {e}")
            # Don't fail the request if logging fails
            return state

    async def _generate_embedding(self, text: str) -> list[float]:
        """Generate embedding using OpenAI"""
        response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding

    async def run(
        self,
        trainer_id: str,
        query: str,
        client_id: str | None = None
    ) -> dict[str, Any]:
        """Execute Coach Brain workflow"""
        initial_state: CoachBrainState = {
            'trainer_id': trainer_id,
            'client_id': client_id,
            'query': query,
            'methodology': None,
            'context': [],
            'response': None,
            'error': None
        }

        result = await self.graph.ainvoke(initial_state)

        return {
            'response': result['response'],
            'context_used': result['context'],
            'error': result.get('error')
        }


# Standalone functions for training data management

async def generate_and_store_embedding(
    trainer_id: str,
    content: str,
    input_type: str,
    source_id: str | None = None
) -> bool:
    """Generate embedding and store training data"""
    try:
        # Generate embedding
        embedding_response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=content
        )
        embedding = embedding_response.data[0].embedding

        # Store in database
        supabase.table('methodology_training_data').insert({
            'trainer_id': trainer_id,
            'content': content,
            'input_type': input_type,
            'source_id': source_id,
            'embedding': embedding
        }).execute()

        return True

    except Exception as e:
        print(f"Error storing training data: {e}")
        return False


async def batch_generate_embeddings(trainer_id: str) -> dict[str, int]:
    """Batch process existing training data without embeddings"""
    try:
        # Get training data without embeddings
        response = supabase.table('methodology_training_data') \
            .select('id, content') \
            .eq('trainer_id', trainer_id) \
            .is_('embedding', 'null') \
            .execute()

        if not response.data:
            return {'processed': 0, 'failed': 0}

        processed = 0
        failed = 0

        for item in response.data:
            try:
                # Generate embedding
                embedding_response = await openai.embeddings.create(
                    model="text-embedding-3-small",
                    input=item['content']
                )
                embedding = embedding_response.data[0].embedding

                # Update record
                supabase.table('methodology_training_data') \
                    .update({'embedding': embedding}) \
                    .eq('id', item['id']) \
                    .execute()

                processed += 1

            except Exception as e:
                print(f"Failed to process item {item['id']}: {e}")
                failed += 1

        return {'processed': processed, 'failed': failed}

    except Exception as e:
        print(f"Error in batch processing: {e}")
        return {'processed': 0, 'failed': 0}
