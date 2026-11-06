# WebRTC reliability fixes

- All Socket.IO offer, answer, and ICE candidate messages are match-bound, shape-validated, and size-limited before relay. Only approved fields are forwarded.
- SDP limit: 64 KiB; ICE candidate line: 4096 bytes. SDP requires basic session/media fields; malformed traffic is dropped.
- ICE restart requests are restricted to the currently paired peer and throttled (one per 10 seconds per socket).
- Client side attempts one ICE restart per peer connection before failing, keeps the old peer during transient disconnects, and clears recovery timers if transport reconnects.
- Camera/mic errors are identified by DOMException name; permissions, missing devices, busy devices and insecure contexts have actionable messages.
- TURN remains a deployment-specific prerequisite: configure and test TURN_URLS and TURN_SECRET separately. A successful CI run does not prove real-world NAT traversal.
