<script lang="ts">
  import { Web3Auth } from '@web3auth/web3auth'
  import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base'
  import { onMount } from 'svelte'

  let clientId = process.env.CLIENT_ID
  let web3Auth
  let provider
  let userInfo

  const subscribeAuthEvents = web3auth => {
    web3auth.on('connected', data => {
      if (data) {
        getUserInfo()
      }
    })
  }

  onMount(() => {
    const init = async () => {
      try {
        web3Auth = new Web3Auth({
          clientId,
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155
          }
        })

        subscribeAuthEvents(web3Auth)

        await web3Auth.initModal()

        provider = web3Auth.provider
      } catch (error) {
        console.error('err', error)
      }
    }

    init()
  })

  const login = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }
    provider = await web3Auth.connect()
  }

  const logout = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }
    await web3Auth.logout()
    provider = null
  }

  const getUserInfo = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }
    const user = await web3Auth.getUserInfo()
    userInfo = user ? user.email : ''
  }

  const continueToApp = async () => {
    web3Auth.provider
      .request({
        method: 'eth_private_key'
      })
      .then(privKey => {
        const userDataLocalStorage = JSON.stringify({
          ...localStorage,
          privateKey: privKey
        })
        const base64UserData = btoa(userDataLocalStorage)
        const url = new URL(window?.location.toString())
        const urlParams = url.searchParams
        const _callbackUrl = urlParams.get('callback')
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
      })
  }
</script>

<div style="margin-top: 100px;">
  <p>{userInfo}</p>
  {#if !provider}
    <button on:click={login}>Login</button>
  {:else}
    <button on:click={logout}>Logout</button>
  {/if}
  <button on:click={getUserInfo}>User Info</button>

  {#if userInfo}
    <div class="mt-8"><button on:click={continueToApp}>Continue to App</button></div>
  {/if}
</div>
