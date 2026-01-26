<svelte:head>
	<title>How to Play - Cube Toss!</title>
	<style>
		.bg-90s {
			background: #54276f;
		}
		.text-90s-pink {
			color: #ff1493;
		}
		.text-90s-cyan {
			color: #00ced1;
		}
		.text-90s-yellow {
			color: #ffd700;
		}
		.text-90s-purple {
			color: #54276f;
		}
		.bg-90s-pink {
			background-color: #ff1493;
		}
		.bg-90s-cyan {
			background-color: #00ced1;
		}
		.bg-90s-yellow {
			background-color: #ffd700;
		}
		.bg-90s-purple {
			background-color: #54276f;
		}
		.border-90s-pink {
			border-color: #ff1493;
		}
		.border-90s-cyan {
			border-color: #00ced1;
		}
	</style>
</svelte:head>

<div class="p-4">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-8 text-center">
			<a href="/">
				<h1
					class="mb-2 text-4xl font-bold text-white drop-shadow-lg"
					style="text-shadow: 3px 3px 0 #FF1493, 6px 6px 0 #00CED1;"
				>
					🎲 Cube Toss!
				</h1>
			</a>
			<p class="text-lg font-bold text-white" style="text-shadow: 2px 2px 0 #9B59B6;">
				How to Play
			</p>
		</div>

		<!-- Back link -->
		<a href="/" class="text-90s-cyan hover:text-90s-yellow mb-6 inline-block font-bold">
			← Back to Home
		</a>

		<!-- Rules Card -->
		<div class="border-90s-pink rounded-2xl border-4 bg-black/80 p-8 shadow-2xl backdrop-blur-lg">
			<!-- Overview -->
			<section class="mb-8">
				<h2 class="text-90s-yellow mb-4 text-2xl font-bold">Overview</h2>
				<p class="text-white">
					Cube Toss is a cube game of risk and reward. Roll cubes to score points, but watch out for
					red cubes that can bust your turn! The first player to reach 100 points triggers the final
					round.
				</p>
			</section>

			<!-- The Cubes -->
			<section class="mb-8">
				<h2 class="text-90s-yellow mb-4 text-2xl font-bold">The Cubes</h2>
				<p class="mb-4 text-white">You roll 10 cubes. Each cube can land on one of three colors:</p>
				<ul class="space-y-3 text-white">
					<li class="flex items-start gap-3">
						<span class="bg-90s-cyan mt-1 inline-block size-6 flex-shrink-0 rounded-full"></span>
						<div>
							<strong class="text-90s-cyan text-lg">Green</strong>
							<p class="text-sm text-gray-300">
								Worth +1 point! Green cubes get "locked" and added to your turn score. You keep
								rolling the remaining cubes.
							</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<span class="bg-90s-yellow mt-1 inline-block size-6 flex-shrink-0 rounded-full"></span>
						<div>
							<strong class="text-90s-yellow text-lg">Yellow</strong>
							<p class="text-sm text-gray-300">
								Neutral - no points, but no penalty. These cubes stay in play for your next roll.
							</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<span class="bg-90s-pink mt-1 inline-block size-6 flex-shrink-0 rounded-full"></span>
						<div>
							<strong class="text-90s-pink text-lg">Red</strong>
							<p class="text-sm text-gray-300">
								Danger! If you roll ANY red cubes without also rolling at least one green, you
								<strong>BUST</strong> and lose all unbanked points for this turn.
							</p>
						</div>
					</li>
				</ul>
			</section>

			<!-- Your Turn -->
			<section class="mb-8">
				<h2 class="text-90s-yellow mb-4 text-2xl font-bold">Your Turn</h2>
				<ol class="list-inside list-decimal space-y-2 text-white">
					<li>Roll all available cubes.</li>
					<li>Green cubes are locked and added to your turn score.</li>
					<li>
						If you rolled red without any green, you <strong class="text-90s-pink">BUST</strong> and lose
						your turn score.
					</li>
					<li>
						Otherwise, choose to <strong>Roll Again</strong> or <strong>Bank</strong> your points, and
						end your turn.
					</li>
					<li>If all 10 cubes become green, you can roll all 10 again!</li>
				</ol>
			</section>

			<!-- Banking -->
			<section class="mb-8">
				<h2 class="text-90s-yellow mb-4 text-2xl font-bold">Banking</h2>
				<p class="text-white">
					When you bank, your turn score is added to your total score safely. Your turn ends and the
					next player goes. Banking is the only way to secure your points - if you bust, you lose
					everything you earned that turn!
				</p>
			</section>

			<!-- Winning -->
			<section class="mb-8">
				<h2 class="text-90s-yellow mb-4 text-2xl font-bold">Winning</h2>
				<p class="mb-4 text-white">
					The first player to reach <strong class="text-90s-cyan">100 points</strong> triggers the
					<strong class="text-90s-yellow">Final Round</strong>!
				</p>
				<p class="text-white">
					In the final round, every other player gets one last turn to try to beat the high score.
					The player with the most points at the end wins!
				</p>
			</section>

			<!-- Play button -->
			<div class="mt-8 text-center">
				<a
					href="/"
					class="bg-90s-cyan inline-block rounded-xl border-b-4 border-cyan-800 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:brightness-110"
				>
					🎲 Play Now!
				</a>
			</div>
		</div>
	</div>
</div>
