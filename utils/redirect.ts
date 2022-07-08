export const doRedirect = (base64UserData: string) => {
    const url = new URL(window?.location.toString())
    const urlParams = url.searchParams

    const _callbackUrl = urlParams.get('callback')
    if(_callbackUrl) {
        const callbackUrl = new URL(_callbackUrl)
        callbackUrl.searchParams.set('user_data', base64UserData)

        switch (urlParams.get('platform')) {
        case 'electron': {
            //`circles-something://open?user_data=${base64UserData}`
            window.location.assign(callbackUrl.toString())
            break
        }
        case 'capacitor': {
            //`https://web-host-iota.vercel.app/open/?user_data=${base64UserData}`
            // @ts-ignore
            window.location = callbackUrl.toString()
            break
        }
        default: {
            window.location.assign(callbackUrl.toString())
            break
        }
        }
    }
}