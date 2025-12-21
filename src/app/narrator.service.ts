import { Injectable, signal } from '@angular/core';

export interface ScriptStep {
	text: string;
	delay: number;
}

@Injectable({
	providedIn: 'root',
})
export class NarratorService {
	private synth = window.speechSynthesis;
	// Use signals for reactive state if needed, or just plain properties for valid voices
	availableVoices = signal<SpeechSynthesisVoice[]>([]);

	constructor() {
		this.loadVoices();
	}

	loadVoices(): Promise<SpeechSynthesisVoice[]> {
		return new Promise((resolve) => {
			let voices = this.synth.getVoices();
			if (voices.length > 0) {
				this.availableVoices.set(voices);
				resolve(voices);
			} else {
				this.synth.onvoiceschanged = () => {
					voices = this.synth.getVoices();
					this.availableVoices.set(voices);
					resolve(voices);
				};
			}
		});
	}

	cancel() {
		this.synth.cancel();
	}

	speakSegment(
		text: string,
		rate: number,
		voice: SpeechSynthesisVoice | null,
		delayAfter: number,
		onStart?: () => void,
		onEnd?: () => void
	): Promise<void> {
		return new Promise((resolve) => {
			const u = new SpeechSynthesisUtterance(text);
			u.rate = rate;
			u.lang = 'zh-TW';
			if (voice) {
				u.voice = voice;
			}

			u.onstart = () => {
				if (onStart) onStart();
			};

			u.onend = () => {
				if (onEnd) onEnd();
				setTimeout(resolve, delayAfter);
			};

			u.onerror = (e) => {
				console.error('Speech error', e);
				// Resolve anyway to prevent game lockup
				resolve();
			};

			this.synth.speak(u);
		});
	}

	generateScript(activeRoles: Set<string>): ScriptStep[] {
		const has = (id: string) => activeRoles.has(id);

		const SHORT = 2000;
		const MEDIUM = 4000;
		const LONG = 6000;

		const timeline: ScriptStep[] = [];
		const say = (text: string, delay: number = 1000) =>
			timeline.push({ text, delay });

		// 1. Start
		say('天黑請閉眼，所有人把眼睛閉上。', 3000);

		// 2. Minions (Evil)
		say(
			`壞人請睜眼，互相確認身分。${
				has('oberon') ? '奧伯倫是壞人，但他不睜眼，你們也看不到他。' : ''
			}`,
			LONG
		);
		say('壞人請閉眼。', 2500);

		// 3. Merlin
		if (has('merlin')) {
			say('梅林請睜眼。', 2000);

			let thumbText = '除了莫德雷德之外的壞人，請豎起大拇指讓梅林確認身分。';
			if (!has('mordred') && !has('oberon')) {
				thumbText = '壞人請豎起大拇指讓梅林確認身分。';
			} else if (has('mordred') && !has('oberon')) {
				thumbText = '除了莫德雷德之外的壞人，請豎起大拇指。';
			} else if (!has('mordred') && has('oberon')) {
				thumbText = '壞人包含奧伯倫，請豎起大拇指。';
			}

			say(thumbText, LONG);
			say('壞人請收回大拇指。', 1500);
			say('梅林請閉眼。', 2500);
		}

		// 4. Percival
		if (has('percival')) {
			say('派西維爾請睜眼。', 2000);
			const merlinOrMorgana = has('morgana') ? '梅林與魔甘娜' : '梅林';
			say(`${merlinOrMorgana}，請豎起大拇指讓派西維爾確認身分。`, LONG);
			say(`${merlinOrMorgana}，請收回大拇指。`, 1500);
			say('派西維爾請閉眼。', 2500);
		}

		// 5. End
		say('天亮請睜眼！', 1000);
		say('遊戲開始，請選出第一位隊長。', 0);

		return timeline;
	}
}
