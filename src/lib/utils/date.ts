export const get_local_date = (date_str: string) => {
		if (!date_str) return '...';
		else {
			const [year, month, day] = date_str.split('-').map(Number);
			const localDate = new Date(year, month - 1, day);
			localDate.toISOString().slice(0, 10);
			return localDate.toLocaleString('en-US', { timeZone: 'America/New_York' }).slice(0, 9);
			// return localDate.toISOString().slice(0, 10);
		}
	};

export const format_time = (time_str: string): string => {
		const [hours, minutes, seconds] = time_str.split(':').map(Number);
		const date = new Date();
		date.setHours(hours, minutes, seconds);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};
