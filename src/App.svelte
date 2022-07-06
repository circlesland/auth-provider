<script lang="ts">
  import { Web3Auth } from '@web3auth/web3auth'
  import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base'
  import { onMount } from 'svelte'

  let clientId =
    'BFhfbhaiGyShjMhp_Im2MMAaNbnEdAL4zqXp2Qb7vMKpkuXnPGJ5LCVOICApQsquuVYWRyvpAtRFNrmOqFdw8nQ'
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
        switch (new URL(window?.location.toString()).searchParams.get('platform')) {
          case 'electron': {
            window.location.assign(`circles-something://open?user_data=${base64UserData}`)
            break
          }
          case 'capacitor': {
            window.open(
              `https://auth-provider.vercel.app/open/?user_data=${base64UserData}`
            )
            break
          }
          default: {
            window.location.assign(`http://localhost:3000?user_data=${base64UserData}`)
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
