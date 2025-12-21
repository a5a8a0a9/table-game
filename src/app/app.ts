import { CommonModule } from '@angular/common';
import {
	Component,
	computed,
	effect,
	inject,
	OnInit,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NarratorService } from './narrator.service';

interface Role {
	id: string;
	name: string;
	icon: string;
	desc: string;
}

interface ConfigRule {
	good: number;
	evil: number;
	text: string;
}

@Component({
	selector: 'yo-root',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './app.html',
	styleUrls: ['./app.scss'],
})
export class App implements OnInit {
	private narrator = inject(NarratorService);

	readonly ROLES: Role[] = [
		{ id: 'merlin', name: '梅林', icon: '🧙‍♂️', desc: '看到壞人' },
		{ id: 'percival', name: '派西維爾', icon: '👸', desc: '看到梅林/魔甘娜' },
		{ id: 'mordred', name: '莫德雷德', icon: '🦹', desc: '梅林看不到' },
		{ id: 'morgana', name: '魔甘娜', icon: '🧛‍♀️', desc: '假扮梅林' },
		{ id: 'oberon', name: '奧伯倫', icon: '👺', desc: '壞人看不到' },
	];

	readonly CONFIG_RULES: Record<number, ConfigRule> = {
		5: { good: 3, evil: 2, text: '建議配置：梅林 + 刺客(或其他壞人)' },
		6: {
			good: 4,
			evil: 2,
			text: '建議配置：梅林 + 派西維爾 + 莫德雷德 + 刺客',
		},
		7: {
			good: 4,
			evil: 3,
			text: '標準局：梅林 + 派西維爾 + 魔甘娜 + 刺客(無莫德雷德)',
		},
		8: {
			good: 5,
			evil: 3,
			text: '標準局：梅林 + 派西維爾 + 魔甘娜 + 刺客 + (忠臣x3)',
		},
		9: { good: 6, evil: 3, text: '9人局：可考慮加入 莫德雷德 以增加好人難度' },
		10: {
			good: 6,
			evil: 4,
			text: '滿人局：梅林 + 派西維爾 + 莫德雷德 + 魔甘娜 + 奧伯倫(或刺客)',
		},
	};

	// State Signals
	playerCount = signal(5);
	roles = signal<Set<string>>(new Set(['merlin']));
	rate = signal(0.9);
	selectedVoiceName = signal('');
	isPlaying = signal(false);
	currentStatus = signal('');
	isSpeaking = signal(false);
	showRules = signal(false);

	// Computed
	currentConfig = computed(() => this.CONFIG_RULES[this.playerCount()]);
	availableVoices = this.narrator.availableVoices;

	// Voices filtered for Chinese usually, or all
	displayVoices = computed(() => {
		const all = this.availableVoices();
		const zh = all.filter(
			(v) =>
				v.lang.includes('zh') ||
				v.lang.includes('CN') ||
				v.lang.includes('TW') ||
				v.lang.includes('HK')
		);
		return zh.length > 0 ? zh : all;
	});

	ngOnInit() {
		// Attempt to select a default voice
		effect(() => {
			const voices = this.displayVoices();
			if (voices.length > 0 && !this.selectedVoiceName()) {
				const tw = voices.find((v) => v.lang === 'zh-TW');
				if (tw) {
					this.selectedVoiceName.set(tw.name);
				} else {
					this.selectedVoiceName.set(voices[0].name);
				}
			}
		});
	}

	toggleRole(id: string) {
		this.roles.update((current) => {
			const newSet = new Set(current);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	}

	isRoleActive(id: string) {
		return this.roles().has(id);
	}

	toggleRules() {
		this.showRules.update((v) => !v);
	}

	async startGame() {
		if (this.isPlaying()) return;
		this.isPlaying.set(true);

		const voice = this.availableVoices().find(
			(v) => v.name === this.selectedVoiceName()
		);
		const rate = this.rate();
		const script = this.narrator.generateScript(this.roles());

		try {
			// Unlock/Start
			await this.speak('遊戲開始', rate, voice || null, 100);

			for (const step of script) {
				if (!this.isPlaying()) break;
				await this.speak(step.text, rate, voice || null, step.delay);
			}
		} catch (e) {
			console.error(e);
		} finally {
			this.stopGame();
		}
	}

	stopGame() {
		this.isPlaying.set(false);
		this.narrator.cancel();
		this.updateStatus('', false);
	}

	private speak(
		text: string,
		rate: number,
		voice: SpeechSynthesisVoice | null,
		delay: number
	) {
		return this.narrator.speakSegment(
			text,
			rate,
			voice,
			delay,
			() => this.updateStatus(text, true),
			() => this.updateStatus('...', false)
		);
	}

	private updateStatus(text: string, speaking: boolean) {
		this.currentStatus.set(text);
		this.isSpeaking.set(speaking);
	}
}
