package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.ForumRole;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ForumRoleRepository extends MongoRepository<ForumRole, String> {

    List<ForumRole> findByForumIdOrderByPositionDesc(String forumId);

    ForumRole findFirstByForumIdAndIsDefaultTrue(String forumId);

    long deleteByForumId(String forumId);
}
