import { useCallback, useEffect, useState } from 'react'
import Router, { useRouter } from 'next/router'
import Head from 'next/head'
import { encode as btoa } from 'base-64'
import { nextMonday } from 'date-fns'

import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import Loader from 'components/Loader'
import { Container as OffsetBorderContainer } from 'components/OffsetBorder'
import EventsPaginationButton from 'components/user/EventsPaginationButton'
import FishAvatar from 'components/user/FishAvatar'
import Flag from 'components/user/Flag'
import Tabs, { TabType } from 'components/user/Tabs'
import renderEvents from 'components/user/EventRow'

import * as API from 'apiClient'
import useQuery from 'hooks/useQuery'
import usePaginatedEvents from 'hooks/usePaginatedEvents'
import { LoginContext } from 'hooks/useLogin'
import { useQueriedToast, Toast, Alignment } from 'hooks/useToast'

import { graffitiToColor, numberToOrdinal } from 'utils'
import { nextMondayFrom } from 'utils/date'

// The number of events to display in the Recent Activity list.
const EVENTS_LIMIT = 25

const validTabValue = (x: string) =>
  x === 'weekly' || x === 'all' || x === 'settings'

interface Props {
  loginContext: LoginContext
}
const sumValues = (x: Record<string, number>) =>
  Object.values(x).reduce((a, b) => a + b, 0)
export default function User({ loginContext }: Props) {
  const $toast = useQueriedToast({
    queryString: 'toast',
    duration: 8e3,
  })

  const router = useRouter()
  const { isReady: routerIsReady } = router
  const userId = (router?.query?.id || '') as string
  const rawTab = useQuery('tab')
  const [$activeTab, $setActiveTab] = useState<TabType>('weekly')

  const [$user, $setUser] = useState<API.ApiUser | undefined>(undefined)

  const [$events, $setEvents] = useState<API.ListEventsResponse | undefined>(
    undefined
  )
  const [$allTimeMetrics, $setAllTimeMetrics] = useState<
    API.UserMetricsResponse | undefined
  >(undefined)
  const [$weeklyMetrics, $setWeeklyMetrics] = useState<
    API.UserMetricsResponse | undefined
  >(undefined)
  const [$metricsConfig, $setMetricsConfig] = useState<
    API.MetricsConfigResponse | undefined
  >(undefined)
  const [$fetched, $setFetched] = useState(false)
  useEffect(() => {
    if (rawTab && validTabValue(rawTab)) {
      $setActiveTab(rawTab as TabType)
    }
  }, [rawTab])

  useEffect(() => {
    let isCanceled = false

    const fetchData = async () => {
      try {
        if (!routerIsReady || $fetched) {
          return
        }
        const [user, events, allTimeMetrics, weeklyMetrics, metricsConfig] =
          await Promise.all([
            API.getUser(userId),
            API.listEvents({
              userId,
              limit: EVENTS_LIMIT,
            }),
            API.getUserAllTimeMetrics(userId),
            API.getUserWeeklyMetrics(userId),
            API.getMetricsConfig(),
          ])

        if (isCanceled) {
          return
        }

        if (
          'error' in user ||
          'error' in events ||
          'error' in allTimeMetrics ||
          'error' in weeklyMetrics ||
          'error' in metricsConfig
        ) {
          Router.push(
            `/leaderboard?toast=${btoa(
              'An error occurred while fetching user data'
            )}`
          )
          return
        }
        $setUser(user)
        $setEvents(events)
        $setAllTimeMetrics(allTimeMetrics)
        $setWeeklyMetrics(weeklyMetrics)
        $setMetricsConfig(metricsConfig)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(e)

        throw e
      }
    }

    fetchData()
    return () => {
      isCanceled = true
    }
  }, [
    routerIsReady,
    userId,
    loginContext?.metadata?.id,
    loginContext?.metadata?.graffiti,
    $fetched,
  ])

  useEffect(() => {
    if (!$user) {
      return
    }
    $setFetched(true)
  }, [$user])

  // Recent Activity hooks
  const { $hasPrevious, $hasNext, fetchPrevious, fetchNext } =
    usePaginatedEvents(userId, EVENTS_LIMIT, $events, $setEvents)

  // Tab hooks
  const onTabChange = useCallback((t: TabType) => {
    $setActiveTab(t)
  }, [])

  if (
    !$user ||
    !$allTimeMetrics ||
    !$metricsConfig ||
    !$weeklyMetrics ||
    !$events
  ) {
    return <Loader />
  }

  const avatarColor = graffitiToColor($user.graffiti)
  const ordinalRank = numberToOrdinal($user.rank)
  const startDate = new Date(2021, 11, 1)
  const endDate = nextMondayFrom(nextMonday(new Date()))

  const totalWeeklyLimit = sumValues(
    $metricsConfig.weekly_limits
  ).toLocaleString()
  const weeklyPoints = $weeklyMetrics.points.toLocaleString()

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{$user.graffiti}</title>
        <meta name="description" content={String($user.graffiti)} />
      </Head>

      <Navbar
        loginContext={loginContext}
        fill="black"
        className="bg-ifpink text-black"
      />

      <main className="bg-ifpink flex-1 justify-center flex pt-16 pb-32">
        <div style={{ flexBasis: 1138 }}>
          <OffsetBorderContainer>
            <div className="px-24 pt-16 pb-12">
              {/* Header */}
              <div
                className="flex justify-between mb-8"
                style={{ width: '100%' }}
              >
                <div>
                  <h1 className="font-extended text-6xl mt-6 mb-8">
                    {$user.graffiti}
                  </h1>

                  <div className="font-favorit flex flex-wrap gap-x-16 gap-y-2">
                    <div>
                      <div>All Time Rank</div>
                      <div className="text-3xl mt-2">{ordinalRank}</div>
                    </div>
                    <div>
                      <div>Total Points</div>
                      <div className="text-3xl mt-2">
                        {$user.total_points.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div>Weekly Points</div>
                      <div className="text-3xl mt-2">
                        {weeklyPoints} / {totalWeeklyLimit}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <FishAvatar color={avatarColor} />
                  <div className="mt-4">
                    <Flag code={$user.country_code} />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs
                setRawMetadata={loginContext.setRawMetadata}
                setUserStatus={loginContext.setStatus}
                reloadUser={loginContext.reloadUser}
                toast={$toast}
                activeTab={$activeTab}
                onTabChange={onTabChange}
                user={$user}
                authedUser={loginContext.metadata}
                allTimeMetrics={$allTimeMetrics}
                weeklyMetrics={$weeklyMetrics}
                metricsConfig={$metricsConfig}
                setFetched={$setFetched}
                setUser={$setUser}
              />

              {/* Recent Activity */}
              {$activeTab !== 'settings' && (
                <>
                  <h1 className="font-favorit" id="recent-activity">
                    Recent Activity
                  </h1>

                  <table className="font-favorit w-full">
                    <thead>
                      <tr className="text-xs text-left tracking-widest border-b border-black">
                        <th className="font-normal py-4">ACTIVITY</th>
                        <th className="font-normal">DATE</th>
                        <th className="font-normal">POINTS</th>
                        <th className="font-normal max-w-[13rem]">DETAILS</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {renderEvents(startDate, endDate, $events.data)}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </OffsetBorderContainer>
          {/* Recent Activity Pagination */}
          {$activeTab !== 'settings' && (
            <div className="flex font-favorit justify-center mt-8">
              <div className="flex gap-x-1.5">
                <EventsPaginationButton
                  disabled={!$hasPrevious}
                  onClick={fetchPrevious}
                >{`<< Previous`}</EventsPaginationButton>
                <div>{`|`}</div>
                <EventsPaginationButton
                  disabled={!$hasNext}
                  onClick={fetchNext}
                >{`Next >>`}</EventsPaginationButton>
              </div>
            </div>
          )}
        </div>
      </main>
      <Toast
        message={$toast.message}
        visible={$toast.visible}
        alignment={Alignment.Top}
      />
      <Footer />
    </div>
  )
}
