"""
SEO Keyword Service

Manages keyword tracking and ranking.
Sprint 42: Local SEO Automation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class KeywordService:
    """Service for SEO keyword management"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def add_keyword(
        self,
        trainer_id: str,
        keyword: str,
        keyword_type: str,
        search_volume: Optional[int] = None,
        competition: Optional[str] = None,
        target_rank: int = 10,
    ) -> Optional[Dict[str, Any]]:
        """
        Add a new keyword to track

        Args:
            trainer_id: Trainer UUID
            keyword: Keyword phrase
            keyword_type: primary, secondary, long_tail, local
            search_volume: Monthly search volume
            competition: low, medium, high
            target_rank: Target ranking position

        Returns:
            Created keyword record or None on error
        """
        try:
            data = {
                'trainer_id': trainer_id,
                'keyword': keyword.lower(),
                'keyword_type': keyword_type,
                'search_volume': search_volume,
                'competition': competition,
                'target_rank': target_rank,
                'status': 'active',
            }

            response = (
                self.supabase.table('seo_keywords')
                .insert(data)
                .execute()
            )

            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error adding keyword: {e}")
            return None

    async def update_ranking(
        self,
        keyword_id: str,
        current_rank: int,
        url: Optional[str] = None,
    ) -> bool:
        """
        Update keyword ranking

        Args:
            keyword_id: Keyword UUID
            current_rank: Current ranking position
            url: URL ranking for this keyword

        Returns:
            Success boolean
        """
        try:
            # Get current keyword data
            keyword = (
                self.supabase.table('seo_keywords')
                .select('*')
                .eq('id', keyword_id)
                .single()
                .execute()
            ).data

            if not keyword:
                return False

            # Update rank history
            rank_history = keyword.get('rank_history', [])
            rank_history.append({
                'date': datetime.now().date().isoformat(),
                'rank': current_rank,
                'url': url,
            })

            # Update best rank
            best_rank = keyword.get('best_rank')
            if not best_rank or current_rank < best_rank:
                best_rank = current_rank

            # Update record
            self.supabase.table('seo_keywords').update({
                'current_rank': current_rank,
                'best_rank': best_rank,
                'rank_history': rank_history,
                'last_checked_at': datetime.now().isoformat(),
            }).eq('id', keyword_id).execute()

            return True
        except Exception as e:
            logger.error(f"Error updating ranking: {e}")
            return False

    async def get_keywords(
        self,
        trainer_id: str,
        status: Optional[str] = 'active',
    ) -> List[Dict[str, Any]]:
        """
        Get all keywords for a trainer

        Args:
            trainer_id: Trainer UUID
            status: Filter by status

        Returns:
            List of keywords
        """
        try:
            query = self.supabase.table('seo_keywords').select('*').eq('trainer_id', trainer_id)

            if status:
                query = query.eq('status', status)

            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting keywords: {e}")
            return []

    async def generate_local_keywords(
        self,
        trainer_id: str,
        business_name: str,
        city: str,
        state: str,
        specialties: List[str],
    ) -> List[Dict[str, str]]:
        """
        Generate local keyword suggestions

        Args:
            trainer_id: Trainer UUID
            business_name: Business name
            city: City
            state: State
            specialties: Training specialties

        Returns:
            List of suggested keywords
        """
        keywords = []

        # Primary keywords (location + service)
        primary_templates = [
            f"personal trainer {city}",
            f"personal training {city}",
            f"fitness coach {city}",
            f"personal trainer {city} {state}",
        ]

        for template in primary_templates:
            keywords.append({
                'keyword': template.lower(),
                'keyword_type': 'primary',
                'search_volume': None,  # Would need keyword research API
                'competition': 'medium',
                'rationale': 'Location-based primary keyword',
            })

        # Secondary keywords (specialty + location)
        for specialty in specialties:
            keywords.extend([
                {
                    'keyword': f"{specialty} coach {city}".lower(),
                    'keyword_type': 'secondary',
                    'search_volume': None,
                    'competition': 'medium',
                    'rationale': f'Specialty-based keyword for {specialty}',
                },
                {
                    'keyword': f"{specialty} trainer near me".lower(),
                    'keyword_type': 'local',
                    'search_volume': None,
                    'competition': 'low',
                    'rationale': f'Near me search for {specialty}',
                },
            ])

        # Long-tail keywords (very specific)
        long_tail_templates = [
            f"best personal trainer {city}",
            f"affordable personal training {city}",
            f"online personal trainer {city}",
            f"mobile personal trainer {city}",
            f"{city} personal trainer reviews",
        ]

        for template in long_tail_templates:
            keywords.append({
                'keyword': template.lower(),
                'keyword_type': 'long_tail',
                'search_volume': None,
                'competition': 'low',
                'rationale': 'Long-tail conversion keyword',
            })

        # Brand keywords
        keywords.append({
            'keyword': business_name.lower(),
            'keyword_type': 'primary',
            'search_volume': None,
            'competition': 'low',
            'rationale': 'Brand name keyword',
        })

        return keywords

    async def get_ranking_trend(
        self,
        keyword_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get ranking trend for a keyword

        Args:
            keyword_id: Keyword UUID
            days: Number of days to analyze

        Returns:
            Trend analysis
        """
        try:
            keyword = (
                self.supabase.table('seo_keywords')
                .select('*')
                .eq('id', keyword_id)
                .single()
                .execute()
            ).data

            if not keyword:
                return {}

            rank_history = keyword.get('rank_history', [])
            if not rank_history:
                return {'trend': 'no_data'}

            # Filter to recent days
            cutoff_date = (datetime.now() - timedelta(days=days)).date()
            recent_history = [
                h for h in rank_history
                if datetime.fromisoformat(h['date']).date() >= cutoff_date
            ]

            if not recent_history:
                return {'trend': 'insufficient_data'}

            # Calculate trend
            first_rank = recent_history[0]['rank']
            last_rank = recent_history[-1]['rank']
            rank_change = first_rank - last_rank  # Positive = improvement

            # Determine trend
            if rank_change > 5:
                trend = 'improving'
            elif rank_change < -5:
                trend = 'declining'
            else:
                trend = 'stable'

            return {
                'trend': trend,
                'rank_change': rank_change,
                'first_rank': first_rank,
                'last_rank': last_rank,
                'best_rank': min(h['rank'] for h in recent_history),
                'worst_rank': max(h['rank'] for h in recent_history),
                'data_points': len(recent_history),
            }
        except Exception as e:
            logger.error(f"Error getting ranking trend: {e}")
            return {}

    async def get_performance_summary(
        self,
        trainer_id: str,
    ) -> Dict[str, Any]:
        """
        Get overall SEO performance summary

        Args:
            trainer_id: Trainer UUID

        Returns:
            Performance summary
        """
        try:
            keywords = await self.get_keywords(trainer_id)

            if not keywords:
                return {
                    'total_keywords': 0,
                    'avg_rank': None,
                    'keywords_top_10': 0,
                    'keywords_top_3': 0,
                }

            # Calculate stats
            total_keywords = len(keywords)
            ranked_keywords = [k for k in keywords if k.get('current_rank')]

            avg_rank = (
                sum(k['current_rank'] for k in ranked_keywords) / len(ranked_keywords)
                if ranked_keywords else None
            )

            keywords_top_10 = len([k for k in keywords if k.get('current_rank', 100) <= 10])
            keywords_top_3 = len([k for k in keywords if k.get('current_rank', 100) <= 3])

            # Calculate trends
            improving = 0
            declining = 0
            for keyword in keywords:
                trend_data = await self.get_ranking_trend(keyword['id'], days=7)
                if trend_data.get('trend') == 'improving':
                    improving += 1
                elif trend_data.get('trend') == 'declining':
                    declining += 1

            return {
                'total_keywords': total_keywords,
                'avg_rank': round(avg_rank, 1) if avg_rank else None,
                'keywords_top_10': keywords_top_10,
                'keywords_top_3': keywords_top_3,
                'keywords_improving': improving,
                'keywords_declining': declining,
                'keywords_by_type': {
                    'primary': len([k for k in keywords if k['keyword_type'] == 'primary']),
                    'secondary': len([k for k in keywords if k['keyword_type'] == 'secondary']),
                    'long_tail': len([k for k in keywords if k['keyword_type'] == 'long_tail']),
                    'local': len([k for k in keywords if k['keyword_type'] == 'local']),
                }
            }
        except Exception as e:
            logger.error(f"Error getting performance summary: {e}")
            return {}
