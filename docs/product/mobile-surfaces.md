# Mobile surfaces and permissions

## Navigation

Phones use four or fewer persistent bottom destinations. Requesters see Home,
Discover, and Activity. Operators gain Operations. Desktop moves the same
destinations into a sidebar and adds Settings for owners.

Home is request-first rather than a miniature infrastructure dashboard. It
shows the person's allowance and requests. Operations contains service health,
transfer speed, and queue state. This keeps friends away from implementation
details while giving an owner fast access from the same application.

## Honest states

Disconnected discovery accepts a query but explains why no result provider can
answer it. It does not display popular titles from fixtures. Operations treats
an empty qBittorrent response as a clear queue and treats no configuration,
authentication failures, timeouts, and malformed responses as different
conditions.

## Quota behavior

Movie and series limits are independent. An owner can eventually apply hourly
and/or daily limits to each person. The strictest remaining bucket is shown.
Submitting a request reserves every active bucket atomically; a double tap
cannot create extra allowance. A denied request should state when the limiting
bucket resets.

The current UI shows an em dash until persisted limits are connected. Showing a
made-up number would teach people to distrust the product.

## Motion and access

Touch targets aim for at least 42px, focus indicators remain visible, and
content works at 360px without horizontal scrolling. Motion is restrained and
reduced when the operating system requests reduced motion.
