export class APIWrapper {
	private static readonly PROXY_URL: string = 'http://localhost:3333/';

	private static async request(
		method: 'GET' | 'POST',
		url: string,
		body?: any,
		headers?: HeadersInit
	): Promise<any> {
		const requestOptions: RequestInit = {
			method: method,
			headers: {
				...headers
			}
		};

		if (body) {
			requestOptions.body = JSON.stringify(body);
		}

		const fullUrl = `${APIWrapper.PROXY_URL}${url}`;

		try {
			const response = await fetch(fullUrl, requestOptions);

			if (!response.ok) {
				throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
			}

			if (response.status !== 204) {
				return await response.json();
			}
		} catch (error) {
			console.error(`Error in ${method} request:`, error);
			throw error;
		}
	}

	public static async get(url: string, headers?: HeadersInit): Promise<any> {
		return await APIWrapper.request('GET', url, undefined, headers);
	}

	// get with query paramenters
	public static async getWithQuery(url: string, query: any): Promise<any> {
		const queryString = Object.keys(query)
			.map((key) => key + '=' + query[key])
			.join('&');
		return await APIWrapper.get(`${url}?${queryString}`);
	}

	public static async post(url: string, body: any, headers?: HeadersInit): Promise<any> {
		return await APIWrapper.request('POST', url, body, headers);
	}
}
