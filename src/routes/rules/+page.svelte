<script>
	import ButtonCyan from '$lib/components/ButtonCyan.svelte';
	import Logo from '$lib/components/Logo.svelte';
</script>

<svelte:head>
	<title>How to Play - Cube Toss!</title>
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
					<Logo />
				</h1>
			</a>
			<p class="text-lg font-bold text-white" style="text-shadow: 2px 2px 0 #9B59B6;">
				How to Play
			</p>
		</div>

		<!-- Back link -->
		<a href="/" class="mb-6 inline-block font-bold text-90s-cyan hover:text-90s-yellow">
			← Back to Home
		</a>

		<!-- Rules Card -->
		<div
			class="rounded-2xl border-4 border-90s-pink bg-black/80 p-8 shadow-[0_0_20px_rgba(255,20,147,0.5)] shadow-90s-pink"
		>
			<!-- Overview -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold text-90s-yellow">Overview</h2>
				<p class="text-white">
					Cube Toss is a cube game of risk and reward. Roll cubes to score points, but watch out for
					pink cubes that can bust your turn! The first player to reach 100 points triggers the
					final round.
				</p>
			</section>

			<!-- The Cubes -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold text-90s-yellow">The Cubes</h2>
				<p class="mb-4 text-white">You roll 10 cubes. Each cube can land on one of three colors:</p>
				<ul class="space-y-3 text-white">
					<li class="flex items-start gap-3">
						<span class="mt-1 inline-block size-6 flex-shrink-0 rounded-full bg-90s-cyan"></span>
						<div>
							<strong class="text-lg text-90s-cyan">Blue</strong>
							<p class="text-sm text-gray-300">
								Worth +1 point! Blue cubes get "locked" and added to your turn score. You keep
								rolling the remaining cubes.
							</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 inline-block size-6 flex-shrink-0 rounded-full bg-90s-yellow"></span>
						<div>
							<strong class="text-lg text-90s-yellow">Yellow</strong>
							<p class="text-sm text-gray-300">
								Neutral - no points, but no penalty. These cubes stay in play for your next roll.
							</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 inline-block size-6 flex-shrink-0 rounded-full bg-90s-pink"></span>
						<div>
							<strong class="text-lg text-90s-pink">Pink</strong>
							<p class="text-sm text-gray-300">
								Danger! If you roll ANY pink cubes without also rolling at least one blue, you
								<strong>BUST</strong> and lose all unbanked points for this turn.
							</p>
						</div>
					</li>
				</ul>
			</section>

			<!-- Your Turn -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold text-90s-yellow">Your Turn</h2>
				<ol class="list-inside list-decimal space-y-2 text-white">
					<li>Roll all available cubes.</li>
					<li>Blue cubes are locked and added to your turn score.</li>
					<li>
						If you rolled pink without any blue, you <strong class="text-90s-pink">BUST</strong> and lose
						your turn score.
					</li>
					<li>
						Otherwise, choose to <strong>Roll Again</strong> or <strong>Bank</strong> your points, and
						end your turn.
					</li>
					<li>If all 10 cubes become blue, you can roll all 10 again!</li>
				</ol>
			</section>

			<!-- Banking -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold text-90s-yellow">Banking</h2>
				<p class="text-white">
					When you bank, your turn score is added to your total score safely. Your turn ends and the
					next player goes. Banking is the only way to secure your points - if you bust, you lose
					everything you earned that turn!
				</p>
			</section>

			<!-- Winning -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold text-90s-yellow">Winning</h2>
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
				<ButtonCyan href="/">Play Now!</ButtonCyan>
			</div>
		</div>
	</div>
</div>
