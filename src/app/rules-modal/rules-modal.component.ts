import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
	selector: 'yo-rules-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './rules-modal.component.html',
	styleUrl: './rules-modal.component.scss',
})
export class RulesModalComponent {
	@ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

	open() {
		this.dialog.nativeElement.showModal();
	}

	close() {
		this.dialog.nativeElement.close();
	}

	onBackdropClick(event: MouseEvent) {
		const rect = this.dialog.nativeElement.getBoundingClientRect();
		const isInDialog =
			rect.top <= event.clientY &&
			event.clientY <= rect.top + rect.height &&
			rect.left <= event.clientX &&
			event.clientX <= rect.left + rect.width;

		if (!isInDialog) {
			this.dialog.nativeElement.close();
		}
	}
}
