import { Trophy, Flame, Target } from 'lucide-react'

export default function ChallengesPage() {
  const challenges = [
    {
      id: 1,
      title: 'Watch Streak',
      description: 'Watch for 7 consecutive days',
      type: 'watch-streak',
      progress: 5,
      reward: { points: 100, badge: '🔥' },
      difficulty: 'medium',
    },
    {
      id: 2,
      title: 'Social Butterfly',
      description: 'Watch with 5 different friends',
      type: 'social',
      progress: 3,
      reward: { points: 50, badge: '🦋' },
      difficulty: 'easy',
    },
    {
      id: 3,
      title: 'Trivia Master',
      description: 'Complete 10 trivia challenges',
      type: 'trivia',
      progress: 0,
      reward: { points: 200, badge: '🧠' },
      difficulty: 'hard',
    },
  ]

  const leaderboard = [
    { rank: 1, name: 'VideoWizard', points: 5420 },
    { rank: 2, name: 'ChillMaster', points: 4890 },
    { rank: 3, name: 'WatchPartyKing', points: 4120 },
    { rank: 4, name: 'MovieBuff', points: 3650 },
    { rank: 5, name: 'ShowTime', points: 3200 },
  ]

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-8">Challenges & Leaderboard</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Daily Challenges */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Daily Challenges</h2>
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {challenge.reward.badge} {challenge.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{challenge.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      challenge.difficulty === 'easy' ? 'bg-green-500 bg-opacity-20 text-green-300' :
                      challenge.difficulty === 'medium' ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' :
                      'bg-red-500 bg-opacity-20 text-red-300'
                    }`}>
                      {challenge.difficulty}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-accent-400">{challenge.progress}%</span>
                    </div>
                    <div className="w-full bg-dark-tertiary rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full"
                        style={{ width: `${challenge.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Reward */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Reward:</span>
                    <span className="font-semibold text-accent-400">+{challenge.reward.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-accent-500" />
              Leaderboard
            </h2>
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1 ? 'bg-yellow-500' :
                        entry.rank === 2 ? 'bg-gray-400' :
                        entry.rank === 3 ? 'bg-orange-600' :
                        'bg-dark-tertiary'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{entry.name}</p>
                      </div>
                    </div>
                    <p className="font-bold text-accent-400">{entry.points}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Your Rank */}
            <div className="mt-6 p-4 rounded-lg gradient-primary">
              <p className="text-sm text-gray-200">Your Rank</p>
              <p className="text-3xl font-bold">#42</p>
              <p className="text-sm text-gray-200 mt-2">2,850 points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
