package com.mtg.deckbuilder.user.repo;

import com.mtg.deckbuilder.user.domain.Profile;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Page<Profile> findAllByOrderByFollowerCountDescDeckCountDesc(Pageable pageable);
}
