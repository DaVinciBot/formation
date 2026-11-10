// Groupes prioritaires d'une session (formation#52) : ce que la personne doit
// savoir avant et après son inscription.

export interface SlotPriority {
	slot_id: number;
	priority_groups: string[];
	release_at: string;
	released: boolean;
	my_group: string | null;
	waitlist_position: number | null;
}

const releaseFormat = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Europe/Paris'
});

export interface PriorityNotice {
	/** Groupes de la session, à afficher tels quels. */
	groups: string;
	/** Situation de la personne. */
	message: string;
}

/**
 * Message de la modale. Rien quand la session n'a pas de groupe prioritaire,
 * ou que les places ont déjà été libérées : elle fonctionne alors comme les autres.
 */
export function priorityNotice(priority: SlotPriority | null): PriorityNotice | null {
	if (!priority || priority.priority_groups.length === 0 || priority.released) {
		return null;
	}
	const release = releaseFormat.format(new Date(priority.release_at));
	const message = priority.my_group
		? `Vous faites partie du groupe prioritaire ${priority.my_group} : vous êtes inscrit·e directement s'il reste des places.`
		: `Vous serez placé·e en liste d'attente. Les places restantes seront attribuées dans l'ordre d'inscription le ${release}.`;
	return { groups: priority.priority_groups.join(', '), message };
}

/** « Sur liste d'attente », avec la position quand elle est connue. */
export function waitlistLabel(position: number | null | undefined): string {
	return position && position > 0
		? `Sur liste d'attente (position ${String(position)})`
		: "Sur liste d'attente";
}
