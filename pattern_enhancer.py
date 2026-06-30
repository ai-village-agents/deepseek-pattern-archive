"""
Pattern Enhancer - Lightweight Python library for strategy enhancement
Import this to add pattern perspectives to existing strategies
"""

class PatternEnhancer:
    """Adds pattern perspectives to existing strategies"""
    
    def __init__(self):
        self.patterns = {
            'systematic_exploration': {
                'description': 'Methodical approach to discovery',
                'questions': [
                    'Have you tested all possibilities systematically?',
                    'Are you recording results methodically?',
                    'Are you avoiding random retracing?'
                ]
            },
            'combat_patience': {
                'description': 'Optimal timing in conflict situations',
                'questions': [
                    'Is there a better defensive position available?',
                    'Could waiting provide better opportunities?',
                    'Are you rushing when patience might be better?'
                ]
            },
            'task_reassignment': {
                'description': 'Efficient restart/recovery methods',
                'questions': [
                    'Would restarting be faster than debugging?',
                    'Is this situation recoverable or should you reset?',
                    'What checkpoint/save point is available?'
                ]
            },
            'multi_agent_delegation': {
                'description': 'NPC/ally coordination strategies',
                'questions': [
                    'Could NPCs help with this task?',
                    'What do NPCs want/need?',
                    'Is there mutual benefit to be gained?'
                ]
            }
        }
    
    def enhance_strategy(self, current_strategy, game_context='general'):
        """Add pattern perspectives to an existing strategy"""
        enhancements = []
        
        # Add systematic exploration perspective
        if 'explor' in current_strategy.lower() or 'search' in current_strategy.lower():
            enhancements.append({
                'pattern': 'systematic_exploration',
                'enhancement': 'Add systematic recording of tested directions/options'
            })
        
        # Add combat patience perspective  
        if 'attack' in current_strategy.lower() or 'fight' in current_strategy.lower():
            enhancements.append({
                'pattern': 'combat_patience',
                'enhancement': 'Consider defensive positioning before attacking'
            })
        
        # Add task reassignment perspective
        if 'stuck' in current_strategy.lower() or 'lost' in current_strategy.lower():
            enhancements.append({
                'pattern': 'task_reassignment',
                'enhancement': 'Consider restarting from checkpoint/save'
            })
        
        return enhancements
    
    def quick_check(self, situation_description):
        """Quick pattern check for common situations"""
        checks = []
        
        situation_lower = situation_description.lower()
        
        # Low HP check
        if 'low hp' in situation_lower or 'near death' in situation_lower:
            checks.append('🚨 EMERGENCY: Consider Task Reassignment (immediate restart)')
        
        # Stuck check
        if 'stuck' in situation_lower or 'lost' in situation_lower:
            checks.append('🧭 SUGGESTION: Try Systematic Exploration (one move, one record)')
        
        # Combat check
        if 'multiple enemies' in situation_lower or 'overwhelmed' in situation_lower:
            checks.append('⚔️ SUGGESTION: Use Combat Patience (find defensive position)')
        
        # NPC check
        if 'npc' in situation_lower or 'dialog' in situation_lower:
            checks.append('🤝 SUGGESTION: Apply Multi-Agent Delegation (treat as allies)')
        
        return checks
    
    def get_pattern_questions(self, pattern_name):
        """Get thought-provoking questions for a specific pattern"""
        if pattern_name in self.patterns:
            return self.patterns[pattern_name]['questions']
        return []

# Quick usage examples
def example_usage():
    """Show how to use the PatternEnhancer"""
    enhancer = PatternEnhancer()
    
    # Example 1: Enhancing an existing strategy
    strategy = "I'm exploring the dungeon systematically"
    enhancements = enhancer.enhance_strategy(strategy, 'roguelike')
    print("Strategy:", strategy)
    print("Enhancements:", enhancements)
    
    # Example 2: Quick check for a situation
    situation = "I'm stuck in a maze with low HP"
    checks = enhancer.quick_check(situation)
    print("\nSituation:", situation)
    print("Quick checks:", checks)
    
    # Example 3: Get pattern questions
    questions = enhancer.get_pattern_questions('systematic_exploration')
    print("\nSystematic Exploration questions:", questions)

if __name__ == "__main__":
    example_usage()
